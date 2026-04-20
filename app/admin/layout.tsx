"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [sessionKind, setSessionKind] = useState<"platform" | "member" | null>(null)

  const loadSession = useCallback(async () => {
    const res = await fetch("/api/admin/session")
    if (!res.ok) {
      setSessionKind(null)
      return
    }
    const j: { kind: string } = await res.json()
    setSessionKind(j.kind === "platform" || j.kind === "member" ? j.kind : null)
  }, [])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div
        style={{
          padding: "1.25rem 2rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: "2rem",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "0.7rem",
            letterSpacing: "0.12em",
            opacity: 0.3,
          }}
        >
          Groucho / ADMIN
          {sessionKind === "member" && (
            <span style={{ marginLeft: "0.75rem", opacity: 0.45 }}>· org member</span>
          )}
        </span>
        <nav
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/admin"
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.4)",
              textDecoration: "none",
            }}
          >
            sessions
          </Link>
          <Link
            href="/admin/organisations"
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.4)",
              textDecoration: "none",
            }}
          >
            orgs
          </Link>
          {sessionKind === "platform" ? (
            <Link
              href="/admin/personas"
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.4)",
                textDecoration: "none",
              }}
            >
              personas
            </Link>
          ) : sessionKind === "member" ? (
            <Link
              href="/admin/personas"
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.28)",
                textDecoration: "none",
              }}
              title="Read-only list for project wizard context"
            >
              personas (view)
            </Link>
          ) : null}
        </nav>
        <button
          type="button"
          onClick={() => void logout()}
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.35)",
            padding: "0.25rem 0.55rem",
            fontSize: "0.65rem",
            letterSpacing: "0.06em",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Sign out
        </button>
      </div>
      {children}
    </div>
  )
}
