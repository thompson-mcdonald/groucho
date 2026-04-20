import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await authClient.auth.getUser()

  if (userErr || !user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const { data: members, error: memErr } = await supabase
    .from("organisation_members")
    .select("organisation_id, role")
    .eq("user_id", user.id)

  if (memErr) {
    console.error("me organisation_members:", memErr)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  if (!members?.length) {
    return NextResponse.json([])
  }

  const ids = [...new Set(members.map((m) => m.organisation_id))]
  const { data: orgs, error: orgErr } = await supabase
    .from("organisations")
    .select("id, name, slug, created_at")
    .in("id", ids)

  if (orgErr) {
    console.error("me organisations:", orgErr)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  const byId = new Map((orgs ?? []).map((o) => [o.id, o]))
  const list: { id: string; name: string; slug: string; created_at: string; role: string }[] = []
  for (const m of members) {
    const o = byId.get(m.organisation_id)
    if (o) list.push({ ...o, role: m.role })
  }

  return NextResponse.json(list)
}
