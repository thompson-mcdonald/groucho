import { NextRequest, NextResponse } from "next/server"
import { normalizeAdminSlug } from "@/lib/admin-slug"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await authClient.auth.getUser()

  if (userErr || !user?.id) {
    return NextResponse.json(
      { error: "Sign in with email first (one-time code from the previous step)." },
      { status: 401 },
    )
  }

  let body: { name: string; slug: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const name = body.name?.trim()
  const slug = normalizeAdminSlug(body.slug ?? "")
  if (!name || name.length < 2 || name.length > 128) {
    return NextResponse.json(
      { error: "Name must be between 2 and 128 characters." },
      { status: 400 },
    )
  }
  if (!slug) {
    return NextResponse.json({ error: "A valid slug is required." }, { status: 400 })
  }

  const { data: org, error: orgErr } = await supabase
    .from("organisations")
    .insert({ name, slug })
    .select("id, name, slug, created_at")
    .single()

  if (orgErr) {
    if (orgErr.code === "23505") {
      return NextResponse.json(
        { error: "An organisation with that slug already exists. Pick another slug." },
        { status: 409 },
      )
    }
    console.error("organisations signup insert:", orgErr)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  const { error: memErr } = await supabase.from("organisation_members").insert({
    organisation_id: org.id,
    user_id: user.id,
    role: "owner",
    accepted_at: new Date().toISOString(),
  })

  if (memErr) {
    console.error("organisation_members signup insert:", memErr)
    await supabase.from("organisations").delete().eq("id", org.id)
    return NextResponse.json({ error: "Could not complete signup" }, { status: 500 })
  }

  return NextResponse.json(org, { status: 201 })
}
