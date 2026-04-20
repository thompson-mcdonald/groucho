import { NextRequest, NextResponse } from "next/server"
import { resolveAdminActor } from "@/lib/admin-actor"
import { normalizeAdminSlug } from "@/lib/admin-slug"
import {
  requireOrgAdmin,
  requireOrgMember,
  requireOrgOwner,
  unauthorized,
} from "@/lib/org-access"
import { supabase } from "@/lib/supabase"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const actor = await resolveAdminActor()
  if (!actor) return unauthorized()
  const { orgId } = await params
  const deny = await requireOrgMember(actor, orgId)
  if (deny) return deny

  const { data: org, error: orgErr } = await supabase
    .from("organisations")
    .select("id, name, slug, created_at")
    .eq("id", orgId)
    .maybeSingle()

  if (orgErr || !org) {
    if (orgErr) console.error("organisation get:", orgErr)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data: projects, error: pErr } = await supabase
    .from("projects")
    .select("id, name, slug, created_at, expose_to_anon_read, settings")
    .eq("organisation_id", orgId)
    .order("created_at", { ascending: true })

  if (pErr) {
    console.error("projects list:", pErr)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  return NextResponse.json({ ...org, projects: projects ?? [] })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const actor = await resolveAdminActor()
  if (!actor) return unauthorized()
  const { orgId } = await params
  const deny = await requireOrgAdmin(actor, orgId)
  if (deny) return deny

  let body: { name?: string; slug?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const updates: { name?: string; slug?: string } = {}
  if (body.name !== undefined) {
    const n = body.name.trim()
    if (!n) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 })
    updates.name = n
  }
  if (body.slug !== undefined) {
    const s = normalizeAdminSlug(body.slug)
    if (!s) return NextResponse.json({ error: "Invalid slug." }, { status: 400 })
    updates.slug = s
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("organisations")
    .update(updates)
    .eq("id", orgId)
    .select("id, name, slug, created_at")
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "An organisation with that slug already exists." },
        { status: 409 },
      )
    }
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    console.error("organisation patch:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const actor = await resolveAdminActor()
  if (!actor) return unauthorized()
  const { orgId } = await params

  if (actor.kind === "member") {
    const deny = await requireOrgOwner(actor, orgId)
    if (deny) return deny
  }

  let body: { confirmSlug?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "JSON body required with confirmSlug matching the organisation." },
      { status: 400 },
    )
  }

  const { data: org, error: gErr } = await supabase
    .from("organisations")
    .select("slug")
    .eq("id", orgId)
    .maybeSingle()

  if (gErr || !org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!body.confirmSlug || body.confirmSlug.trim() !== org.slug) {
    return NextResponse.json(
      { error: "confirmSlug must match the organisation slug exactly." },
      { status: 400 },
    )
  }

  const { error } = await supabase.from("organisations").delete().eq("id", orgId)

  if (error) {
    console.error("organisation delete:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
