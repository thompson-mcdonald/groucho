import { NextRequest, NextResponse } from "next/server"
import {
  apiKeyPrefix,
  generateGatekeeperApiKey,
  hashApiKeySecret,
} from "@/lib/api-keys"
import { resolveAdminActor } from "@/lib/admin-actor"
import { requireOrgAdmin, requireOrgMember, unauthorized } from "@/lib/org-access"
import { supabase } from "@/lib/supabase"

async function assertProjectInOrg(
  orgId: string,
  projectId: string,
): Promise<{ ok: true } | { ok: false; status: number }> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, organisation_id")
    .eq("id", projectId)
    .eq("organisation_id", orgId)
    .maybeSingle()

  if (error || !data) return { ok: false, status: 404 }
  return { ok: true }
}

export async function GET(
  _req: NextRequest,
  {
    params,
  }: { params: Promise<{ orgId: string; projectId: string }> },
) {
  const actor = await resolveAdminActor()
  if (!actor) return unauthorized()
  const { orgId, projectId } = await params
  const deny = await requireOrgMember(actor, orgId)
  if (deny) return deny

  const check = await assertProjectInOrg(orgId, projectId)
  if (!check.ok) {
    return NextResponse.json({ error: "Not found" }, { status: check.status })
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, key_prefix, label, last_used_at, created_at, revoked_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("api_keys list:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ orgId: string; projectId: string }> },
) {
  const actor = await resolveAdminActor()
  if (!actor) return unauthorized()
  const { orgId, projectId } = await params
  const deny = await requireOrgAdmin(actor, orgId)
  if (deny) return deny

  const check = await assertProjectInOrg(orgId, projectId)
  if (!check.ok) {
    return NextResponse.json({ error: "Not found" }, { status: check.status })
  }

  let body: { label?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const label = body.label?.trim() || null
  const plaintext = generateGatekeeperApiKey()
  const key_hash = hashApiKeySecret(plaintext)
  const key_prefix = apiKeyPrefix(plaintext)

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      organisation_id: orgId,
      project_id: projectId,
      key_hash,
      key_prefix,
      label,
    })
    .select("id, key_prefix, label, created_at")
    .single()

  if (error) {
    console.error("api_keys insert:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  return NextResponse.json(
    {
      ...data,
      /** Shown once; store server-side or hand to integrator — never logged again. */
      secret: plaintext,
    },
    { status: 201 },
  )
}
