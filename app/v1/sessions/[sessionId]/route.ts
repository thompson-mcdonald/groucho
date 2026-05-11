import { NextRequest } from "next/server"
import { log } from "@/lib/logger"
import { getOrCreateRequestId } from "@/lib/request-trace"
import { resolveProjectContext } from "@/lib/project-resolution"
import { outcomeLabelFromDbStatus } from "@/lib/session-outcome"
import { supabase } from "@/lib/supabase"
import { tracedJson } from "@/lib/with-request-trace"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const authHeader = req.headers.get("authorization")
  const projectResolved = await resolveProjectContext(authHeader)
  if (!projectResolved.ok) {
    return tracedJson(req, projectResolved.body, {
      status: projectResolved.status,
    })
  }
  const { projectId } = projectResolved.context

  const { sessionId: rawId } = await params
  const clientKey = decodeURIComponent(rawId).trim()

  const { data: row, error } = await supabase
    .from("sessions")
    .select("id, session_id, status, created_at, updated_at")
    .eq("session_id", clientKey)
    .eq("project_id", projectId)
    .maybeSingle()

  if (error) {
    log.error("v1_get_session_failed", {
      requestId: getOrCreateRequestId(req),
      projectId,
      detail: error.message,
    })
    return tracedJson(req, { error: "Database error" }, { status: 500 })
  }
  if (!row) {
    return tracedJson(req, { error: "Not found" }, { status: 404 })
  }

  const { count: turnCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("session_id", row.id)
    .eq("role", "user")

  const outcome = outcomeLabelFromDbStatus(row.status)
  const concluded = ["passed", "failed", "redirected", "rejected"].includes(row.status)

  let profile: unknown = null
  if (concluded) {
    const { data: v } = await supabase
      .from("verdicts")
      .select("payload")
      .eq("session_id", row.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    const payload = (v?.payload as Record<string, unknown> | undefined) ?? null
    if (payload && typeof payload === "object" && payload.profile) {
      profile = payload.profile
    }
  }

  return tracedJson(req, {
    id: row.id,
    clientSessionKey: row.session_id,
    status: row.status,
    outcome,
    turnsUsed: turnCount ?? 0,
    startedAt: row.created_at,
    completedAt: concluded ? row.updated_at : null,
    ...(profile ? { profile } : {}),
  })
}
