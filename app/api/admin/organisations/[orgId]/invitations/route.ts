import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { resolveAdminActor } from "@/lib/admin-actor"
import { fetchOrgRole, requireOrgAdmin, requireOrgMember, unauthorized } from "@/lib/org-access"
import { supabase } from "@/lib/supabase"

const ROLES = ["owner", "admin", "member"] as const
type Role = (typeof ROLES)[number]

function isRole(s: string): s is Role {
  return (ROLES as readonly string[]).includes(s)
}

async function assertOrg(orgId: string) {
  const { data, error } = await supabase
    .from("organisations")
    .select("id")
    .eq("id", orgId)
    .maybeSingle()
  return !error && !!data
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const actor = await resolveAdminActor()
  if (!actor) return unauthorized()
  const { orgId } = await params
  const deny = await requireOrgMember(actor, orgId)
  if (deny) return deny

  if (!(await assertOrg(orgId))) {
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("invitations")
    .select("id, email, role, expires_at, accepted_at")
    .eq("organisation_id", orgId)
    .order("expires_at", { ascending: false })

  if (error) {
    console.error("invitations list:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const actor = await resolveAdminActor()
  if (!actor) return unauthorized()
  const { orgId } = await params
  const deny = await requireOrgAdmin(actor, orgId)
  if (deny) return deny

  if (!(await assertOrg(orgId))) {
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 })
  }

  let body: { email: string; role: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const role = body.role?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 })
  }
  if (!role || !isRole(role)) {
    return NextResponse.json(
      { error: `role must be one of: ${ROLES.join(", ")}` },
      { status: 400 },
    )
  }

  if (role === "owner" && actor.kind === "member") {
    const myRole = await fetchOrgRole(actor.userId, orgId)
    if (myRole !== "owner") {
      return NextResponse.json(
        { error: "Only an owner can invite another owner." },
        { status: 403 },
      )
    }
  }

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 14)

  const { data, error } = await supabase
    .from("invitations")
    .insert({
      organisation_id: orgId,
      email,
      role,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select("id, email, role, expires_at, accepted_at, token")
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "An active invitation may already exist for this email." },
        { status: 409 },
      )
    }
    console.error("invitations insert:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
