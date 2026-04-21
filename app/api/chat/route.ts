import { NextRequest, NextResponse } from "next/server"
import { postSessionMessage } from "@/lib/post-session-message"

export async function POST(req: NextRequest) {
  let body: { message: string; sessionId: string; personaId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { message, sessionId, personaId } = body
  if (!message?.trim() || !sessionId?.trim()) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    )
  }

  return postSessionMessage({
    authorization: req.headers.get("authorization"),
    sessionId: sessionId.trim(),
    message: message.trim(),
    personaId: personaId?.trim() || undefined,
  })
}
