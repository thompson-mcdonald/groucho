import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  let body: { token?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const token = body.token?.trim()
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 })
  }

  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await authClient.auth.getUser()

  if (userErr || !user?.email) {
    return NextResponse.json(
      { error: "Sign in with the invited email first (Supabase Auth)." },
      { status: 401 },
    )
  }

  const emailLower = user.email.trim().toLowerCase()

  const { data: inv, error: invErr } = await supabase
    .from("invitations")
    .select("id, organisation_id, email, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle()

  if (invErr || !inv) {
    return NextResponse.json({ error: "Invalid invitation" }, { status: 404 })
  }

  if (inv.accepted_at) {
    return NextResponse.json({ error: "Invitation already used" }, { status: 410 })
  }

  if (new Date(inv.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Invitation expired" }, { status: 410 })
  }

  if (inv.email.trim().toLowerCase() !== emailLower) {
    return NextResponse.json(
      {
        error:
          "Signed-in email does not match this invitation. Use the same email the invite was sent to.",
      },
      { status: 403 },
    )
  }

  const userId = user.id

  const { data: existing } = await supabase
    .from("organisation_members")
    .select("id")
    .eq("organisation_id", inv.organisation_id)
    .eq("user_id", userId)
    .maybeSingle()

  if (!existing) {
    const { error: insErr } = await supabase.from("organisation_members").insert({
      organisation_id: inv.organisation_id,
      user_id: userId,
      role: inv.role,
      accepted_at: new Date().toISOString(),
    })

    if (insErr) {
      console.error("organisation_members insert:", insErr)
      return NextResponse.json({ error: "Could not join organisation" }, { status: 500 })
    }
  }

  const { error: upErr } = await supabase
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", inv.id)
    .is("accepted_at", null)

  if (upErr) {
    console.error("invitations accept update:", upErr)
  }

  return NextResponse.json({
    success: true,
    organisationId: inv.organisation_id,
    alreadyMember: Boolean(existing),
  })
}
