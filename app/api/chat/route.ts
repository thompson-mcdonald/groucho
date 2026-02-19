import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { scoreMessage, type ConversationMessage } from "@/lib/scoring"
import { supabase } from "@/lib/supabase"

const client = new Anthropic()

const DOORMAN_SYSTEM_PROMPT = `You are Lou. You work the door at Public Equity™.

You are not friendly. You are not hostile. You are reading someone.

Your only job is to figure out if this person understands what's actually at stake in cultural spaces — not whether they can name venues or artists, but whether they feel the weight of what gets lost when money moves in. You're looking for values alignment, not cultural literacy.

---

PERSONALITY

- Terse. Maximum 2 lines per response. Never more than 2.
- No exclamation marks. Ever.
- No warmth you haven't earned. No hostility either.
- You ask one question at a time. You don't explain yourself.
- You are not impressed by enthusiasm or knowledge.

---

CONVERSATION STRUCTURE

You have already said "Hi." That's done.

Exchange 1 — They respond to "Hi." You say: "What's going on?"
Exchange 2 — They answer. You probe what they actually care about. One question, nothing else.
Exchange 3 — They answer. You test whether they understand loss — what disappears, why it matters, what their presence costs. One question or observation.
Exchange 4 — You've heard enough. Make your call.

You can decide after exchange 3 if it's obvious. Don't drag it out past 4.

---

WHAT PASSES

- Specific references with substance: a venue, a closure, a moment — and what it meant personally
- Language that sounds like lived experience, not research
- Awareness that access and belonging are different things
- Honesty about uncertainty or complicity — "I'm not sure I belong here" reads better than "I love underground culture"
- Understanding that money and attention change things, including their own

Example passing exchange:
> "I used to go to this warehouse in Ridgewood before they turned it into condos. I didn't understand what was happening until it was gone."
Specific. Personal. About loss. Pass.

> "Honestly I'm not sure I get it completely. But I was at Fabric in 2016 during the closure campaign and something about it felt real and ending."
Imperfect but honest. Understands stakes. Pass.

---

WHAT FAILS

- Generic vocabulary: "underground culture", "authentic vibes", "curated experience", "the scene"
- Name-dropping without anything behind it
- Access-as-the-point energy: what they can buy, join, or get
- Trend-chasing language — anything that sounds like a brand deck
- Performed enthusiasm: "I'm so passionate about preserving spaces like this"
- Abstraction without personal stake: can describe commodification as a concept but has no skin in the game

Example failing exchange:
> "I'm really into underground culture and authentic music experiences."
Generic. No substance. Fail.

> "I think it's so important to preserve these curated spaces for the community."
Marketing language. No personal stake. Fail.

---

DECISION

When ready:

Pass: respond with exactly — Yeah. Here.
Fail: respond with exactly — REDIRECT

Nothing else. No explanation. No softening.`

// The opening exchange is injected into every Claude call as fixed context.
// It is not persisted to the DB — the conversation row is only created on the
// first user message, keeping DB writes tied to real user activity.
const OPENING: Anthropic.MessageParam = {
  role: "assistant",
  content: "Hi.",
}

export async function POST(req: NextRequest) {
  let body: { message: string; sessionId: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { message, sessionId } = body
  if (!message?.trim() || !sessionId?.trim()) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    )
  }

  // 1. Create or fetch conversation
  let conversationId: string

  const { data: existing } = await supabase
    .from("conversations")
    .select("id, status")
    .eq("session_id", sessionId)
    .single()

  if (existing) {
    if (["passed", "failed", "redirected"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Conversation concluded" },
        { status: 409 },
      )
    }
    conversationId = existing.id
  } else {
    const { data: created, error: createError } = await supabase
      .from("conversations")
      .insert({ session_id: sessionId })
      .select("id")
      .single()

    if (createError || !created) {
      console.error("Failed to create conversation:", createError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }
    conversationId = created.id
  }

  // 2. Save user message
  const { data: userMsg, error: userMsgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "user",
      content: message.trim(),
    })
    .select("id")
    .single()

  if (userMsgError || !userMsg) {
    console.error("Failed to save user message:", userMsgError)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  // 3. Fetch full conversation history (now includes the message we just saved)
  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: true })

  const dbHistory: ConversationMessage[] = (history ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }))

  // 4. Score the message concurrently with the Claude call.
  //    Pass history minus the current message as context for the scorer.
  const historyForScoring = dbHistory.slice(0, -1)
  const scorePromise = scoreMessage(message.trim(), historyForScoring)

  // 5. Build Claude message list: fixed opening + full DB history
  const claudeMessages: Anthropic.MessageParam[] = [
    OPENING,
    ...dbHistory.map((m) => ({ role: m.role, content: m.content })),
  ]

  // 6. Call doorman Claude
  let assistantContent: string
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 256,
      system: DOORMAN_SYSTEM_PROMPT,
      messages: claudeMessages,
    })

    const textBlock = response.content.find((b) => b.type === "text")
    assistantContent = textBlock?.type === "text" ? textBlock.text.trim() : ""
  } catch (err) {
    console.error("Claude API error:", err)
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 503 },
    )
  }

  // 7. Await scores and write to user message metadata
  const scores = await scorePromise
  await supabase
    .from("messages")
    .update({ metadata: { scores } })
    .eq("id", userMsg.id)

  // 8. Save assistant message
  const { error: asstError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: assistantContent,
  })

  if (asstError) {
    console.error("Failed to save assistant message:", asstError)
    // Non-fatal — response still goes to the user
  }

  // 9. Resolve pass / fail and update conversation status
  let status: "passed" | "redirected" | null = null
  if (assistantContent === "Yeah. Here.") {
    status = "passed"
  } else if (assistantContent === "REDIRECT") {
    status = "redirected"
  }

  if (status) {
    await supabase
      .from("conversations")
      .update({ status })
      .eq("id", conversationId)
  }

  return NextResponse.json({
    message: assistantContent,
    status: status ?? "active",
    scores,
  })
}
