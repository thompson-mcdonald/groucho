import { NextResponse } from "next/server"
import { resolveProjectContext } from "@/lib/project-resolution"
import { outcomeLabelFromDbStatus } from "@/lib/session-outcome"
import { supabase } from "@/lib/supabase"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const authHeader = req.headers.get("authorization")
  const projectResolved = await resolveProjectContext(authHeader)
  if (!projectResolved.ok) {
    return NextResponse.json(projectResolved.body, { status: projectResolved.status })
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
    console.error("v1 get session:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { count: turnCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("session_id", row.id)
    .eq("role", "user")

  const outcome = outcomeLabelFromDbStatus(row.status)
  const concluded = ["passed", "failed", "redirected", "rejected"].includes(row.status)

  return NextResponse.json({
    id: row.id,
    clientSessionKey: row.session_id,
    status: row.status,
    outcome,
    turnsUsed: turnCount ?? 0,
    startedAt: row.created_at,
    completedAt: concluded ? row.updated_at : null,
  })
}
