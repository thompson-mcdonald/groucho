import { NextRequest, NextResponse } from "next/server"
import { resolveProjectContext } from "@/lib/project-resolution"
import { checkRateLimit, readRateLimitConfig } from "@/lib/rate-limit"
import { supabase } from "@/lib/supabase"

/**
 * POST /v1/sessions/{sessionId}/access — register email after a passed session.
 * Always returns 200 with `{ ok: true }` when the request is well-formed, to avoid
 * leaking whether the email already existed (OpenAPI note).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const projectResolved = await resolveProjectContext(req.headers.get("authorization"))
  if (!projectResolved.ok) {
    return NextResponse.json(projectResolved.body, { status: projectResolved.status })
  }
  const { projectId, apiKeyId } = projectResolved.context

  const { sessionId: rawId } = await params
  const clientKey = decodeURIComponent(rawId).trim()

  let body: { email?: string; secret?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
  }

  const rl = readRateLimitConfig()
  const bucket = checkRateLimit({
    namespace: "access",
    key: `${apiKeyId ?? "anon"}:${projectId}:${clientKey}`,
    limit: Math.max(3, Math.floor(rl.sessionPerMinute / 2)),
    windowMs: 60_000,
  })
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "Rate limited" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(bucket.retryAfterMs / 1000)) },
      },
    )
  }

  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .select("id, status, success_secret")
    .eq("session_id", clientKey)
    .eq("project_id", projectId)
    .maybeSingle()

  if (sErr) {
    console.error("v1 access session:", sErr)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  if (!session) {
    return NextResponse.json({ ok: true })
  }

  if (session.status !== "passed") {
    return NextResponse.json({ error: "Session not eligible" }, { status: 403 })
  }

  if (session.success_secret && body.secret?.trim() !== session.success_secret) {
    return NextResponse.json({ error: "Invalid or missing secret" }, { status: 400 })
  }

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .upsert({ email }, { onConflict: "email" })
    .select("id")
    .single()

  if (pErr || !profile) {
    console.error("v1 access profile:", pErr)
    return NextResponse.json({ ok: true })
  }

  const { error: eErr } = await supabase.from("profile_eligibility").insert({
    profile_id: profile.id,
    session_id: session.id,
  })

  if (eErr && eErr.code !== "23505") {
    console.error("v1 access eligibility:", eErr)
  }

  return NextResponse.json({ ok: true })
}
