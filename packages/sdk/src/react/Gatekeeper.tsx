"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import type { ScoreBreakdown, SessionOutcome } from "../client.js"
import { GrouchoApiError } from "../errors.js"
import { useGroucho } from "./context.js"
import { Composer } from "./Composer.js"
import { OutcomeBanner } from "./OutcomeBanner.js"
import { ThinkingIndicator } from "./ThinkingIndicator.js"
import { Transcript, type TranscriptLine } from "./Transcript.js"

const STORAGE_PREFIX = "groucho.session:"

export type GatekeeperProps = {
  sessionId?: string
  onSessionId?: (id: string) => void
  personaId?: string | null
  onOutcome?: (
    outcome: SessionOutcome,
    meta: { scores: ScoreBreakdown; secret?: string },
  ) => void
  renderHeader?: () => ReactNode
  renderFooter?: () => ReactNode
  className?: string
  transcriptLabel?: string
}

type ChatLine = { id: string; role: "user" | "assistant"; content: string }

export function Gatekeeper({
  sessionId: sessionIdProp,
  onSessionId,
  personaId,
  onOutcome,
  renderHeader,
  renderFooter,
  className,
  transcriptLabel,
}: GatekeeperProps) {
  const client = useGroucho()
  const [internalId, setInternalId] = useState<string | null>(null)

  useEffect(() => {
    if (sessionIdProp) return
    if (typeof window === "undefined") return
    const key = STORAGE_PREFIX + window.location.pathname
    let id = sessionStorage.getItem(key)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(key, id)
    }
    setInternalId(id)
  }, [sessionIdProp])

  const sessionId = sessionIdProp ?? internalId ?? ""

  useEffect(() => {
    if (sessionId) onSessionId?.(sessionId)
  }, [sessionId, onSessionId])

  const [draft, setDraft] = useState("")
  const [lines, setLines] = useState<ChatLine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<SessionOutcome>("active")

  const terminal =
    outcome === "passed" ||
    outcome === "redirected" ||
    outcome === "rejected"

  const send = useCallback(async () => {
    const text = draft.trim()
    if (!text || !sessionId || loading || terminal) return

    setError(null)
    setLoading(true)
    setDraft("")
    const userLine: ChatLine = {
      id: `u_${Date.now()}`,
      role: "user",
      content: text,
    }
    setLines((prev) => [...prev, userLine])

    try {
      const res = await client.sendMessage(sessionId, {
        message: text,
        personaId: personaId ?? null,
      })
      const assistantLine: ChatLine = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content: res.message,
      }
      setLines((prev) => [...prev, assistantLine])
      setOutcome(res.status)
      if (res.status !== "active") {
        onOutcome?.(res.status, {
          scores: res.scores,
          ...(res.secret !== undefined ? { secret: res.secret } : {}),
        })
      }
    } catch (e) {
      if (e instanceof GrouchoApiError && e.status === 409) {
        setOutcome("active")
        setLines([])
        if (typeof window !== "undefined") {
          const key = STORAGE_PREFIX + window.location.pathname
          if (!sessionIdProp) {
            const newId = crypto.randomUUID()
            sessionStorage.setItem(key, newId)
            setInternalId(newId)
            setError("This session has ended — starting a new one.")
          } else {
            setError("This session has ended. Start a new session id from your host.")
          }
        }
        return
      }
      setError(e instanceof Error ? e.message : "Something went wrong.")
      setDraft(text)
    } finally {
      setLoading(false)
    }
  }, [
    client,
    draft,
    loading,
    onOutcome,
    personaId,
    sessionId,
    sessionIdProp,
    terminal,
  ])

  const transcriptLines: TranscriptLine[] = useMemo(
    () => lines.map((l) => ({ ...l })),
    [lines],
  )

  if (!sessionId) {
    return (
      <div className={`groucho-root groucho-gatekeeper groucho-gatekeeper--loading${className ? ` ${className}` : ""}`}>
        <p className="groucho-muted">Loading…</p>
      </div>
    )
  }

  return (
    <div
      className={`groucho-root groucho-gatekeeper${className ? ` ${className}` : ""}`}
    >
      {renderHeader?.()}
      <OutcomeBanner status={outcome} />
      {error ? (
        <p className="groucho-error" role="alert">
          {error}
        </p>
      ) : null}
      <Transcript lines={transcriptLines} label={transcriptLabel} />
      <ThinkingIndicator visible={loading} />
      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={() => void send()}
        disabled={loading || terminal}
        inputLabel={transcriptLabel ? `${transcriptLabel} input` : "Your message"}
      />
      {renderFooter?.()}
    </div>
  )
}
