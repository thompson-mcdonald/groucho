"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

type Organisation = {
  id: string
  name: string
  slug: string
  created_at: string
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.65rem",
  letterSpacing: "0.1em",
  opacity: 0.4,
  marginBottom: "0.4rem",
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  maxWidth: "28rem",
  background: "transparent",
  border: "none",
  borderBottom: "1px solid rgba(255,255,255,0.15)",
  color: "#fff",
  outline: "none",
  padding: "0.5rem 0",
  fontFamily: "inherit",
  fontSize: "0.875rem",
  boxSizing: "border-box",
}

function btn(primary: boolean): React.CSSProperties {
  return {
    background: "transparent",
    border: primary
      ? "1px solid rgba(255,255,255,0.4)"
      : "1px solid rgba(255,255,255,0.15)",
    color: primary ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)",
    padding: "0.35rem 0.75rem",
    cursor: "pointer",
    fontSize: "0.7rem",
    letterSpacing: "0.06em",
    fontFamily: "inherit",
  }
}

type SessionKind = "platform" | "member" | null

export default function OrganisationsAdminPage() {
  const [sessionKind, setSessionKind] = useState<SessionKind>(null)
  const [rows, setRows] = useState<Organisation[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugManual, setSlugManual] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSession = useCallback(async () => {
    const res = await fetch("/api/admin/session")
    if (!res.ok) {
      setSessionKind(null)
      return
    }
    const j: { kind: string } = await res.json()
    setSessionKind(j.kind === "platform" || j.kind === "member" ? j.kind : null)
  }, [])

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/organisations")
    if (res.ok) {
      const data = await res.json()
      setRows(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadSession()
    load()
  }, [load, loadSession])

  useEffect(() => {
    if (!slugManual) setSlug(slugify(name))
  }, [name, slugManual])

  async function createOrg(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await fetch("/api/admin/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    })
    const body = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setError(body.error ?? "Save failed")
      return
    }
    setName("")
    setSlug("")
    setSlugManual(false)
    await load()
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1
        style={{
          fontSize: "0.75rem",
          letterSpacing: "0.14em",
          fontWeight: 400,
          opacity: 0.45,
          marginBottom: "2rem",
        }}
      >
        ORGANISATIONS
      </h1>

      {sessionKind === "member" && (
        <p style={{ opacity: 0.4, fontSize: "0.78rem", marginBottom: "1.5rem", maxWidth: "32rem" }}>
          Signed in as an organisation member. Create new top-level organisations from{" "}
          <Link href="/signup/organisation" style={{ color: "rgba(255,255,255,0.55)" }}>
            /signup/organisation
          </Link>{" "}
          or ask a platform operator.
        </p>
      )}

      {sessionKind === "platform" && (
        <form
          onSubmit={createOrg}
          style={{
            marginBottom: "2.5rem",
            paddingBottom: "2rem",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>NEW ORGANISATION</label>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>SLUG</label>
            <input
              style={inputStyle}
              value={slug}
              onChange={(e) => {
                setSlugManual(true)
                setSlug(e.target.value)
              }}
              placeholder="slug"
            />
          </div>
          {error && (
            <p style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: "1rem" }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={saving} style={btn(true)}>
            {saving ? "…" : "Create"}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ opacity: 0.35, fontSize: "0.8rem" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ opacity: 0.35, fontSize: "0.8rem" }}>No organisations yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {rows.map((o) => (
            <li
              key={o.id}
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                padding: "0.85rem 0",
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
              }}
            >
              <Link
                href={`/admin/organisations/${o.id}`}
                style={{
                  color: "rgba(255,255,255,0.85)",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                }}
              >
                {o.name}
              </Link>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.72rem",
                  opacity: 0.35,
                }}
              >
                {o.slug}
              </span>
              <span style={{ marginLeft: "auto", opacity: 0.25, fontSize: "0.7rem" }}>
                {new Date(o.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
