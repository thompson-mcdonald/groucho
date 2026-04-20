import { NextResponse } from "next/server"
import { resolveAdminActor } from "@/lib/admin-actor"

/** Who is using the admin UI / APIs (platform cookie or Supabase org member). */
export async function GET() {
  const actor = await resolveAdminActor()
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (actor.kind === "platform") {
    return NextResponse.json({ kind: "platform", email: actor.email })
  }
  return NextResponse.json({
    kind: "member",
    email: actor.email,
    userId: actor.userId,
  })
}
