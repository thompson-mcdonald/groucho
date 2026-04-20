import { NextResponse } from "next/server"
import { resolveAdminActor } from "@/lib/admin-actor"
import { fetchOrgRole, forbidden, unauthorized } from "@/lib/org-access"

/** Current caller’s role for this org (`platform` bypasses membership). */
export async function GET(_req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const actor = await resolveAdminActor()
  if (!actor) return unauthorized()

  const { orgId } = await params
  if (actor.kind === "platform") {
    return NextResponse.json({ role: "platform" as const })
  }

  const role = await fetchOrgRole(actor.userId, orgId)
  if (!role) return forbidden()
  return NextResponse.json({ role })
}
