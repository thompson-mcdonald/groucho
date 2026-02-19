"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

type Message = {
  role: "bot" | "user"
  content: string
}

const INITIAL_MESSAGES: Message[] = [{ role: "bot", content: "Hi." }]

const SESSION_KEY = "pe_session_id"

function getOrCreateSessionId(): string {
  const existing = sessionStorage.getItem(SESSION_KEY)
  if (existing) return existing
  return resetSessionId()
}

function resetSessionId(): string {
  const id = crypto.randomUUID()
  sessionStorage.setItem(SESSION_KEY, id)
  return id
}

export default function DoorCheck() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [concluded, setConcluded] = useState(false)
  const [sessionId, setSessionId] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    setSessionId(getOrCreateSessionId())
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  async function submit() {
    const text = input.trim()
    if (!text || loading || concluded || !sessionId) return

    setMessages((prev) => [...prev, { role: "user", content: text }])
    setInput("")
    setLoading(true)

    try {
      let res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
      })

      // Stale session (concluded conversation) — reset and retry once
      if (res.status === 409) {
        const freshId = resetSessionId()
        setSessionId(freshId)
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, sessionId: freshId }),
        })
      }

      if (!res.ok) throw new Error(`${res.status}`)

      const data = await res.json()
      setMessages((prev) => [...prev, { role: "bot", content: data.message }])

      if (data.status === "passed") {
        setConcluded(true)
        setTimeout(() => router.push("/doorcheck/access"), 1400)
      } else if (data.status === "redirected") {
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

  return (
    <div className="flex flex-col h-screen">
      {/* Messages */}
      <div className="max-w-[1040px] w-full mx-auto flex flex-1 overflow-y-auto gap-[1.25rem] pt-[3rem] pb-[1rem] px-[2rem] flex-col">
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

      {/* Input */}
      {!concluded && (
        <div className="max-w-[1040px] w-full mx-auto pt-[1rem] pb-[5rem] px-[2rem]">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            disabled={loading}
            placeholder="Type your message"
            className="w-full font-inherit text-white text-md py-[0.5rem] outline-none border-b border-b-white/40 focus:border-b-white/60 bg-transparent disabled:opacity-30"
          />
        </div>
      )}
    </div>
  )
}
