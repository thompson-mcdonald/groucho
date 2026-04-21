import { NextRequest, NextResponse } from "next/server"
import { postSessionMessage } from "@/lib/post-session-message"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId: rawId } = await params
  const sessionId = decodeURIComponent(rawId).trim()
  if (sessionId.length < 8 || sessionId.length > 128) {
    return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 })
  }

  let body: { message?: string; personaId?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const message = body.message?.trim()
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }

  return postSessionMessage({
    authorization: req.headers.get("authorization"),
    sessionId,
    message,
    personaId: body.personaId ?? undefined,
  })
}
