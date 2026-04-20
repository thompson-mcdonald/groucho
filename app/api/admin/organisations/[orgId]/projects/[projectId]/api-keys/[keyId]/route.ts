import { NextRequest, NextResponse } from "next/server"
import { resolveAdminActor } from "@/lib/admin-actor"
import { requireOrgAdmin, unauthorized } from "@/lib/org-access"
import { supabase } from "@/lib/supabase"

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ orgId: string; projectId: string; keyId: string }>
  },
) {
  const actor = await resolveAdminActor()
  if (!actor) return unauthorized()
  const { orgId, projectId, keyId } = await params
  const deny = await requireOrgAdmin(actor, orgId)
  if (deny) return deny

  let body: { revoked?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  if (body.revoked !== true) {
    return NextResponse.json({ error: "Only { revoked: true } is supported." }, { status: 400 })
  }

  const { data: row, error: findErr } = await supabase
    .from("api_keys")
    .select("id")
    .eq("id", keyId)
    .eq("project_id", projectId)
    .eq("organisation_id", orgId)
    .maybeSingle()

  if (findErr || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .select("id, key_prefix, label, last_used_at, created_at, revoked_at")
    .single()

  if (error) {
    console.error("api_keys revoke:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  return NextResponse.json(data)
}
