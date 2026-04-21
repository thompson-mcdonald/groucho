import { createHmac } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { resolveAdminActor } from "@/lib/admin-actor"
import { requireOrgAdmin, unauthorized } from "@/lib/org-access"
import { supabase } from "@/lib/supabase"

function signBody(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex")
}

export async function POST(
  _req: NextRequest,
  {
    params,
  }: { params: Promise<{ orgId: string; projectId: string; webhookId: string }> },
) {
  const actor = await resolveAdminActor()
  if (!actor) return unauthorized()
  const { orgId, projectId, webhookId } = await params
  const deny = await requireOrgAdmin(actor, orgId)
  if (deny) return deny

  const { data: wh, error } = await supabase
    .from("webhooks")
    .select("id, url, signing_secret")
    .eq("id", webhookId)
    .eq("project_id", projectId)
    .eq("organisation_id", orgId)
    .maybeSingle()

  if (error || !wh) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = {
    event: "webhook.ping",
    webhook_id: wh.id,
    sent_at: new Date().toISOString(),
  }
  const rawBody = JSON.stringify(body)

  try {
    const res = await fetch(wh.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Groucho-Event": "webhook.ping",
        "X-Groucho-Signature": `sha256=${signBody(wh.signing_secret, rawBody)}`,
      },
      body: rawBody,
      signal: AbortSignal.timeout(15_000),
    })

    const text = await res.text().catch(() => "")
    return NextResponse.json({
      ok: res.ok,
      http_status: res.status,
      detail: text.slice(0, 500),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
