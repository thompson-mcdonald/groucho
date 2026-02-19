"use client"

import { useState, useEffect } from "react"

const SECRET_KEY = "pe_session_secret"

export default function Access() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sid = params.get("sid")
    const secret = localStorage.getItem(SECRET_KEY)

    if (!sid || !secret) {
      setAuthorized(false)
      return
    }

    fetch(`/api/access?sid=${encodeURIComponent(sid)}&secret=${encodeURIComponent(secret)}`)
      .then((r) => r.json())
      .then((data) => setAuthorized(data.authorized === true))
      .catch(() => setAuthorized(false))
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || loading) return
    setLoading(true)
    // Placeholder — wire up later
    setTimeout(() => {
      setSubmitted(true)
      setLoading(false)
    }, 0)
  }

  if (authorized === null) return null

  if (!authorized) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ fontSize: "0.875rem", letterSpacing: "0.05em", opacity: 0.5 }}>
          Access denied.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {submitted ? (
        <p style={{ fontSize: "0.875rem", letterSpacing: "0.05em" }}>Noted.</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            width: "100%",
            maxWidth: "320px",
            padding: "0 2rem",
          }}
          className=""
        >
          <label className="text-[0.875rem] tracking-[0.05rem]">Email.</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoFocus
            style={{
              background: "transparent",
              border: "none",
              borderBottom: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              outline: "none",
              fontSize: "0.875rem",
              padding: "0.5rem 0",
              fontFamily: "inherit",
              width: "100%",
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.4)",
              color: "#fff",
              fontSize: "0.75rem",
              letterSpacing: "0.1em",
              padding: "0.5rem 1.25rem",
              cursor: loading ? "default" : "pointer",
              fontFamily: "inherit",
              alignSelf: "flex-start",
              opacity: loading ? 0.4 : 1,
            }}
          >
            Submit
          </button>
        </form>
      )}
    </div>
  )
}
