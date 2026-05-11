import { NextRequest } from "next/server"
import { postSessionMessage } from "@/lib/post-session-message"
import { getOrCreateRequestId } from "@/lib/request-trace"
import { tracedJson } from "@/lib/with-request-trace"

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req)
  let body: { message: string; sessionId: string; personaId?: string }
  try {
    body = await req.json()
  } catch {
    return tracedJson(req, { error: "Invalid request" }, { status: 400 })
  }

  const { message, sessionId, personaId } = body
  if (!message?.trim() || !sessionId?.trim()) {
    return tracedJson(
      req,
      { error: "Missing required fields" },
      { status: 400 },
    )
  }

  return postSessionMessage({
    authorization: req.headers.get("authorization"),
    sessionId: sessionId.trim(),
    message: message.trim(),
    personaId: personaId?.trim() || undefined,
    requestId,
    incomingHeaders: req.headers,
  })
}
