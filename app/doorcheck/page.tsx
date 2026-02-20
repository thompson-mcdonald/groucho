"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    realtime: {
      params: { apikey: process.env.NEXT_PUBLIC_SUPABASE_REALTIME_KEY! },
    },
  }
)

type Message = {
  role: "bot" | "user"
  content: string
}

type PersonaOption = {
  id: string
  name: string
  is_active: boolean
  is_default: boolean
}

const INITIAL_MESSAGES: Message[] = [{ role: "bot", content: "Hi." }]

const SESSION_KEY = "pe_session_id"
const SECRET_KEY = "pe_session_secret"

function getOrCreateSession(): string {
  const existing = localStorage.getItem(SESSION_KEY)
  if (existing) return existing
  return resetSession()
}

function resetSession(): string {
  const id = crypto.randomUUID()
  localStorage.setItem(SESSION_KEY, id)
  return id
}

export default function DoorCheck() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [concluded, setConcluded] = useState(false)
  const [sessionId, setSessionId] = useState("")
  const [personas, setPersonas] = useState<PersonaOption[]>([])
  const [selectedPersonaId, setSelectedPersonaId] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  )
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  useEffect(() => {
    setSessionId(getOrCreateSession())
  }, [])

  useEffect(() => {
    fetch("/api/admin/personas")
      .then((r) => r.json())
      .then((data: PersonaOption[]) => {
        const active = data.filter((p) => p.is_active)
        setPersonas(active)
        const def = active.find((p) => p.is_default)
        if (def) setSelectedPersonaId(def.id)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!sessionId) return
    const ch = supabase.channel("pe-typing")
    ch.subscribe()
    typingChannelRef.current = ch
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      supabase.removeChannel(ch)
      typingChannelRef.current = null
    }
  }, [sessionId])

  function broadcastTyping(isTyping: boolean) {
    typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { sessionId, isTyping },
    })
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value)
    if (e.target.value) {
      broadcastTyping(true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000)
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      broadcastTyping(false)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  async function submit() {
    const text = input.trim()
    if (!text || loading || concluded || !sessionId) return

    broadcastTyping(false)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    setMessages((prev) => [...prev, { role: "user", content: text }])
    setInput("")
    setLoading(true)

    try {
      const personaId = selectedPersonaId || undefined
      let res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId, personaId }),
      })

      // Stale session (concluded conversation) — reset and retry once
      if (res.status === 409) {
        const freshId = resetSession()
        setSessionId(freshId)
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, sessionId: freshId, personaId }),
        })
      }

      if (!res.ok) throw new Error(`${res.status}`)

      const data = await res.json()
      setMessages((prev) => [...prev, { role: "bot", content: data.message }])

      if (data.status === "passed") {
        setConcluded(true)
        if (data.secret) localStorage.setItem(SECRET_KEY, data.secret)
        setTimeout(
          () => router.push(`/doorcheck/access?sid=${sessionId}`),
          1400,
        )
      } else if (data.status === "redirected" || data.status === "rejected") {
        setConcluded(true)
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "Something went wrong." },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      submit()
    }
  }

  function restart() {
    const newId = resetSession()
    localStorage.removeItem(SECRET_KEY)
    setSessionId(newId)
    setMessages(INITIAL_MESSAGES)
    setInput("")
    setConcluded(false)
    const def = personas.find((p) => p.is_default)
    if (def) setSelectedPersonaId(def.id)
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Messages */}
      <div className="max-w-[1040px] w-[80%] mx-auto flex flex-1 overflow-y-auto gap-[1.25rem] pt-[3rem] pb-[1rem] flex-col">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`leading-[1.6] max-w-[65%] ${msg.role === "user" ? "self-end opacity-100" : "self-start opacity-70"}`}
          >
            <div className="text-md italic">
              {msg.role === "bot" ? "Lou" : "You"}
            </div>
            <div className={`leading-[1.6] text-lg md:text-xl`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="self-start opacity-40">
            <div className="text-md italic">Lou</div>
            <div className="text-lg md:text-xl">_</div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Reset */}
      {concluded && (
        <div className="max-w-[1040px] w-[80%] mx-auto pt-[1rem] pb-[5rem]">
          <button
            onClick={restart}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.25)",
              outline: "none",
              padding: "0.5rem 0",
              fontSize: "0.7rem",
              fontFamily: "inherit",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            start over
          </button>
        </div>
      )}

      {/* Input */}
      {!concluded && (
        <div className="max-w-[1040px] w-[80%] mx-auto pt-[1rem] pb-[5rem]">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            autoFocus
            disabled={loading}
            placeholder="Type your message"
            className="w-full font-inherit text-white text-md py-[0.5rem] outline-none border-b border-b-white/40 focus:border-b-white/60 bg-transparent disabled:opacity-30"
          />
          {messages.length === 1 && personas.length >= 1 && (
            <select
              value={selectedPersonaId}
              onChange={(e) => setSelectedPersonaId(e.target.value)}
              style={{
                display: "block",
                marginTop: "0.75rem",
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.3)",
                outline: "none",
                fontSize: "0.7rem",
                fontFamily: "inherit",
                letterSpacing: "0.06em",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {personas.map((p) => (
                <option key={p.id} value={p.id} style={{ background: "#000" }}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  )
}
