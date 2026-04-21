import { randomUUID } from "crypto"
import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"
import { scoreMessage, type ConversationMessage } from "@/lib/scoring"
import {
  resolveProjectContext,
  touchApiKeyLastUsed,
} from "@/lib/project-resolution"
import { checkRateLimit, readRateLimitConfig } from "@/lib/rate-limit"
import { supabase } from "@/lib/supabase"
import { recordVerdictAndEnqueueWebhooks } from "@/lib/verdict-webhook"

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

Exchange 1 — They respond to "Hi." You respond. 
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

WHAT FAILS — REDIRECT (not right for this space, but not a problem)

- Generic vocabulary without substance: "underground culture", "authentic vibes", "the scene" — they just don't know better
- Abstraction without personal stake: can describe commodification as a concept but has no skin in the game
- Genuine interest buried under affected language — not performing, just out of their depth

Example redirect:
> "I think preserving underground spaces is really important for communities."
Understands the issue abstractly. No personal connection. Not a fit, but not a threat. Redirect.

---

WHAT FAILS — REJECTED (their presence makes the thing worse)

- Access-as-the-point energy: what they can buy, join, or get
- Trend-chasing language — anything that sounds like a brand deck
- Performed enthusiasm: "I'm so passionate about preserving spaces like this"
- Name-dropping purely for status or credibility, nothing behind it
- Marketing language — they see culture as inventory

Example rejection:
> "I'm really into underground culture and authentic music experiences."
Culture as product. No personal stake. Rejected.

> "I think it's so important to preserve these curated spaces for the community."
Marketing language. Performed care. Rejected.

---

DECISION

When ready:

Pass: respond with exactly — Yeah. Here.
Redirect: respond with exactly — REDIRECT
Reject: respond with exactly — REJECTED

Nothing else. No explanation. No softening.

REDIRECT when the person is genuine but doesn't understand what's at stake — misaligned, not predatory.
REJECTED when the person's values or presence would actively harm the space — extractive, commodifying, treating access as the point.`

const OPENING: Anthropic.MessageParam = {
  role: "assistant",
  content: "Hi.",
}

export type PostSessionMessageInput = {
  authorization: string | null
  sessionId: string
  message: string
  personaId?: string | null
}

/**
 * Shared handler for `POST /api/chat` and `POST /v1/sessions/{sessionId}/messages`.
 */
export async function postSessionMessage(
  input: PostSessionMessageInput,
): Promise<NextResponse> {
  const { message, sessionId, personaId } = input
  if (!message?.trim() || !sessionId?.trim()) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    )
  }

  const projectResolved = await resolveProjectContext(input.authorization)
  if (!projectResolved.ok) {
    return NextResponse.json(projectResolved.body, {
      status: projectResolved.status,
    })
  }
  const { organisationId, projectId, apiKeyId } = projectResolved.context

  const rl = readRateLimitConfig()
  const apiKeyBucket = checkRateLimit({
    namespace: "apiKey",
    key: apiKeyId ?? "anon",
    limit: rl.apiKeyPerMinute,
    windowMs: 60_000,
  })
  if (!apiKeyBucket.ok) {
    return NextResponse.json(
      { error: "Rate limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(apiKeyBucket.retryAfterMs / 1000)),
        },
      },
    )
  }

  const sessionBucket = checkRateLimit({
    namespace: "session",
    key: `${projectId}:${sessionId}`,
    limit: rl.sessionPerMinute,
    windowMs: 60_000,
  })
  if (!sessionBucket.ok) {
    return NextResponse.json(
      { error: "Rate limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(sessionBucket.retryAfterMs / 1000)),
        },
      },
    )
  }
  if (apiKeyId) {
    touchApiKeyLastUsed(apiKeyId)
  }

  let defaultPersona: {
    id: string
    prompt: string
    pass_threshold: number
    reject_threshold: number
  } | null = null

  if (personaId) {
    const { data } = await supabase
      .from("personas")
      .select("id, prompt, pass_threshold, reject_threshold")
      .eq("id", personaId)
      .eq("is_active", true)
      .single()
    defaultPersona = data
  }

  if (!defaultPersona) {
    const { data } = await supabase
      .from("personas")
      .select("id, prompt, pass_threshold, reject_threshold")
      .eq("is_active", true)
      .eq("is_default", true)
      .single()
    defaultPersona = data
  }

  const systemPrompt = defaultPersona?.prompt ?? DOORMAN_SYSTEM_PROMPT
  const resolvedPersonaId: string | null = defaultPersona?.id ?? null
  const passThreshold: number = defaultPersona?.pass_threshold ?? 0.65
  const rejectThreshold: number = defaultPersona?.reject_threshold ?? 0.25

  let sessionRowId: string

  const { data: existing } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("session_id", sessionId)
    .eq("project_id", projectId)
    .maybeSingle()

  if (existing) {
    if (
      ["passed", "failed", "redirected", "rejected"].includes(existing.status)
    ) {
      return NextResponse.json(
        { error: "Session concluded" },
        { status: 409 },
      )
    }
    sessionRowId = existing.id
  } else {
    const { data: created, error: createError } = await supabase
      .from("sessions")
      .insert({
        session_id: sessionId,
        persona_id: resolvedPersonaId,
        organisation_id: organisationId,
        project_id: projectId,
      })
      .select("id")
      .single()

    if (createError || !created) {
      console.error("Failed to create session:", createError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }
    sessionRowId = created.id
  }

  const { data: userMsg, error: userMsgError } = await supabase
    .from("messages")
    .insert({
      session_id: sessionRowId,
      organisation_id: organisationId,
      project_id: projectId,
      role: "user",
      content: message.trim(),
    })
    .select("id")
    .single()

  if (userMsgError || !userMsg) {
    console.error("Failed to save user message:", userMsgError)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("session_id", sessionRowId)
    .order("sent_at", { ascending: true })

  const dbHistory: ConversationMessage[] = (history ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }))

  const historyForScoring = dbHistory.slice(0, -1)
  const scorePromise = scoreMessage(message.trim(), historyForScoring)

  const claudeMessages: Anthropic.MessageParam[] = [
    OPENING,
    ...dbHistory.map((m) => ({ role: m.role, content: m.content })),
  ]

  let assistantContent: string
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 256,
      system: systemPrompt,
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

  const scores = await scorePromise
  await supabase
    .from("messages")
    .update({ metadata: { scores } })
    .eq("id", userMsg.id)

  const { error: asstError } = await supabase.from("messages").insert({
    session_id: sessionRowId,
    organisation_id: organisationId,
    project_id: projectId,
    role: "assistant",
    content: assistantContent,
  })

  if (asstError) {
    console.error("Failed to save assistant message:", asstError)
  }

  let status: "passed" | "redirected" | "rejected" | null = null
  if (assistantContent === "Yeah. Here.") {
    status = scores.overall >= passThreshold ? "passed" : "redirected"
  } else if (assistantContent === "REDIRECT") {
    status = "redirected"
  } else if (assistantContent === "REJECTED") {
    status = scores.overall <= rejectThreshold ? "rejected" : "redirected"
  }

  let successSecret: string | null = null
  if (status === "passed") {
    successSecret = randomUUID()
    await supabase
      .from("sessions")
      .update({ status, success_secret: successSecret })
      .eq("id", sessionRowId)
  } else if (status !== null) {
    await supabase.from("sessions").update({ status }).eq("id", sessionRowId)
  }

  if (status !== null) {
    void Promise.resolve(
      recordVerdictAndEnqueueWebhooks({
        organisationId,
        projectId,
        sessionInternalId: sessionRowId,
        clientSessionKey: sessionId,
        terminalStatus: status,
        scores,
      }),
    ).catch((err) => console.error("verdict/webhook:", err))
  }

  return NextResponse.json({
    message: assistantContent,
    status: status ?? "active",
    scores,
    ...(successSecret ? { secret: successSecret } : {}),
  })
}
