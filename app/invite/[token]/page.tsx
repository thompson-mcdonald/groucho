"use client"

import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

type InviteMeta = {
  organisationName: string
  organisationSlug: string
  email: string
  role: string
  expiresAt: string
}

export default function InviteAcceptPage() {
  const params = useParams()
  const token = typeof params.token === "string" ? params.token : ""

  const [meta, setMeta] = useState<InviteMeta | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [stepMsg, setStepMsg] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    const res = await fetch(
      `/api/invitations/by-token?token=${encodeURIComponent(token)}`,
    )
    const b = await res.json().catch(() => ({}))
    if (!res.ok) {
      setLoadErr(b.error ?? "Invalid invitation")
      setMeta(null)
      return
    }
    setMeta(b)
    setLoadErr(null)
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  async function sendOtp() {
    if (!meta) return
    setBusy(true)
    setStepMsg(null)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: meta.email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.href : undefined,
      },
    })
    setBusy(false)
    if (error) {
      setStepMsg(error.message)
      return
    }
    setOtpSent(true)
    setStepMsg("Check your email for the 6-digit code.")
  }

  async function verifyAndAccept() {
    if (!meta || !code.trim()) return
    setBusy(true)
    setStepMsg(null)
    const supabase = createSupabaseBrowserClient()
    const { error: vErr } = await supabase.auth.verifyOtp({
      email: meta.email,
      token: code.trim(),
      type: "email",
    })
    if (vErr) {
      setBusy(false)
      setStepMsg(vErr.message)
      return
    }

    const res = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ token }),
    })
    const b = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setStepMsg(b.error ?? "Could not accept invite")
      return
    }
    setDone(true)
    setStepMsg(
      b.alreadyMember
        ? "You were already a member. Invitation marked accepted."
        : "You have joined the organisation.",
    )
  }

  if (loadErr) {
    return (
      <div style={{ padding: "2.5rem", maxWidth: "28rem", margin: "0 auto" }}>
        <h1 style={{ fontSize: "1rem", fontWeight: 500, marginBottom: "1rem" }}>
          Invitation
        </h1>
        <p style={{ opacity: 0.65, fontSize: "0.9rem" }}>{loadErr}</p>
      </div>
    )
  }

  if (!meta) {
    return (
      <div style={{ padding: "2.5rem", opacity: 0.45 }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ padding: "2.5rem", maxWidth: "28rem", margin: "0 auto" }}>
      <h1
        style={{
          fontSize: "0.7rem",
          letterSpacing: "0.14em",
          opacity: 0.4,
          marginBottom: "0.5rem",
        }}
      >
        Groucho invite
      </h1>
      <p style={{ fontSize: "1.05rem", marginBottom: "0.25rem" }}>{meta.organisationName}</p>
      <p style={{ fontSize: "0.8rem", opacity: 0.45, marginBottom: "1.75rem" }}>
        Role: {meta.role} · Expires {new Date(meta.expiresAt).toLocaleString()}
      </p>

      <p style={{ fontSize: "0.85rem", opacity: 0.55, marginBottom: "1.25rem" }}>
        Sign in as <strong style={{ color: "#fafafa" }}>{meta.email}</strong> using a one-time
        email code (Supabase Auth). Use the same email this invite was sent to.
      </p>

      {stepMsg && (
        <p style={{ fontSize: "0.85rem", marginBottom: "1rem", opacity: 0.75 }}>
          {stepMsg}
        </p>
      )}

      {!done && (
        <>
          {!otpSent ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void sendOtp()}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.35)",
                color: "#fafafa",
                padding: "0.5rem 1rem",
                cursor: busy ? "wait" : "pointer",
                fontSize: "0.8rem",
              }}
            >
              Email me a sign-in code
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                autoComplete="one-time-code"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  padding: "0.5rem 0.75rem",
                  fontSize: "1rem",
                  letterSpacing: "0.2em",
                  maxWidth: "12rem",
                }}
              />
              <button
                type="button"
                disabled={busy || code.trim().length < 6}
                onClick={() => void verifyAndAccept()}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.35)",
                  color: "#fafafa",
                  padding: "0.5rem 1rem",
                  cursor: busy ? "wait" : "pointer",
                  fontSize: "0.8rem",
                  alignSelf: "flex-start",
                }}
              >
                Verify and join
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
