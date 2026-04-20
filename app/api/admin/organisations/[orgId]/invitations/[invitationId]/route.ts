import { NextRequest, NextResponse } from "next/server"
import { resolveAdminActor } from "@/lib/admin-actor"
import { requireOrgAdmin, unauthorized } from "@/lib/org-access"
import { supabase } from "@/lib/supabase"

export async function DELETE(
  _req: NextRequest,
  {
    params,
  }: { params: Promise<{ orgId: string; invitationId: string }> },
) {
  const actor = await resolveAdminActor()
  if (!actor) return unauthorized()
  const { orgId, invitationId } = await params
  const deny = await requireOrgAdmin(actor, orgId)
  if (deny) return deny

  const { data: row, error: findErr } = await supabase
    .from("invitations")
    .select("id, accepted_at")
    .eq("id", invitationId)
    .eq("organisation_id", orgId)
    .maybeSingle()

  if (findErr || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (row.accepted_at) {
    return NextResponse.json(
      { error: "Cannot delete an invitation that was already accepted." },
      { status: 400 },
    )
  }

  const { error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", invitationId)
    .eq("organisation_id", orgId)

  if (error) {
    console.error("invitations delete:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
