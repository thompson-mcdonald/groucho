import { NextRequest } from "next/server"
import { postSessionMessage } from "@/lib/post-session-message"
import { getOrCreateRequestId } from "@/lib/request-trace"
import { tracedJson } from "@/lib/with-request-trace"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const requestId = getOrCreateRequestId(req)
  const { sessionId: rawId } = await params
  const sessionId = decodeURIComponent(rawId).trim()
  if (sessionId.length < 8 || sessionId.length > 128) {
    return tracedJson(req, { error: "Invalid sessionId" }, { status: 400 })
  }

  let body: { message?: string; personaId?: string | null }
  try {
    body = await req.json()
  } catch {
    return tracedJson(req, { error: "Invalid request" }, { status: 400 })
  }

  const message = body.message?.trim()
  if (!message) {
    return tracedJson(req, { error: "message is required" }, { status: 400 })
  }

  return postSessionMessage({
    authorization: req.headers.get("authorization"),
    sessionId,
    message,
    personaId: body.personaId ?? undefined,
    requestId,
    incomingHeaders: req.headers,
  })
}
