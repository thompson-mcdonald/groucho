import { NextRequest, NextResponse } from "next/server"
import { resolveAdminActor } from "@/lib/admin-actor"
import { normalizeAdminSlug } from "@/lib/admin-slug"
import { requirePlatform, unauthorized } from "@/lib/org-access"
import { supabase } from "@/lib/supabase"

export async function GET() {
  const actor = await resolveAdminActor()
  if (!actor) return unauthorized()

  if (actor.kind === "platform") {
    const { data, error } = await supabase
      .from("organisations")
      .select("id, name, slug, created_at")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("organisations list:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  }

  const { data: memberships, error: mErr } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", actor.userId)

  if (mErr) {
    console.error("organisation_members list:", mErr)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  const ids = [...new Set((memberships ?? []).map((m) => m.organisation_id))]
  if (ids.length === 0) {
    return NextResponse.json([])
  }

  const { data, error } = await supabase
    .from("organisations")
    .select("id, name, slug, created_at")
    .in("id", ids)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("organisations list (member):", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const actor = await resolveAdminActor()
  if (!actor) return unauthorized()
  const deny = await requirePlatform(actor)
  if (deny) return deny

  let body: { name: string; slug: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const name = body.name?.trim()
  const slug = normalizeAdminSlug(body.slug ?? "")
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 })
  }
  if (!slug) {
    return NextResponse.json({ error: "A valid slug is required." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("organisations")
    .insert({ name, slug })
    .select("id, name, slug, created_at")
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "An organisation with that slug already exists." },
        { status: 409 },
      )
    }
    console.error("organisations insert:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
