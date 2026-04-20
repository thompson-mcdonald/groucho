"use client"

import { useState, useEffect, useCallback } from "react"

type Persona = {
  id: string
  name: string
  slug: string
  prompt: string
  is_active: boolean
  is_default: boolean
  pass_threshold: number
  reject_threshold: number
  created_at: string
}

type FormState = {
  name: string
  slug: string
  prompt: string
  is_active: boolean
  is_default: boolean
  pass_threshold: number
  reject_threshold: number
}

const DEFAULT_FORM: FormState = {
  name: "",
  slug: "",
  prompt: "",
  is_active: true,
  is_default: false,
  pass_threshold: 0.65,
  reject_threshold: 0.25,
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

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    background: "transparent",
    border: primary
      ? "1px solid rgba(255,255,255,0.4)"
      : "1px solid rgba(255,255,255,0.15)",
    color: primary ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)",
    padding: "0.2rem 0.65rem",
    cursor: "pointer",
    fontSize: "0.7rem",
    letterSpacing: "0.06em",
    fontFamily: "inherit",
  }
}

function fmt(n: number) {
  return n.toFixed(2)
}

export default function PersonasPage() {
  const [sessionKind, setSessionKind] = useState<"platform" | "member" | null>(null)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"list" | "form">("list")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
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
    const res = await fetch("/api/admin/personas")
    if (res.ok) {
      const data = await res.json()
      setPersonas(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadSession()
    load()
  }, [load, loadSession])

  useEffect(() => {
    if (sessionKind === "member" && view === "form") setView("list")
  }, [sessionKind, view])

  function openCreate() {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setSlugManuallyEdited(false)
    setError(null)
    setView("form")
  }

  function openEdit(p: Persona) {
    setEditingId(p.id)
    setForm({
      name: p.name,
      slug: p.slug,
      prompt: p.prompt,
      is_active: p.is_active,
      is_default: p.is_default,
      pass_threshold: p.pass_threshold ?? 0.65,
      reject_threshold: p.reject_threshold ?? 0.25,
    })
    setSlugManuallyEdited(true)
    setError(null)
    setView("form")
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugManuallyEdited ? prev.slug : slugify(name),
    }))
  }

  function handleSlugChange(slug: string) {
    setSlugManuallyEdited(true)
    setForm((prev) => ({ ...prev, slug }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.slug.trim() || !form.prompt.trim()) {
      setError("Name, slug, and prompt are required.")
      return
    }

    setSaving(true)
    setError(null)

    const url = editingId
      ? `/api/admin/personas/${editingId}`
      : "/api/admin/personas"
    const method = editingId ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Save failed.")
      setSaving(false)
      return
    }

    await load()
    setView("list")
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/personas/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Delete failed.")
      setDeleteConfirm(null)
      return
    }
    setDeleteConfirm(null)
    await load()
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem", opacity: 0.3, fontSize: "0.8rem" }}>
        loading...
      </div>
    )
  }

  if (view === "form") {
    return (
      <div
        style={{
          padding: "2rem",
          maxWidth: "720px",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: "0.875rem",
        }}
      >
        <div
          style={{
            marginBottom: "1.75rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <span style={{ fontSize: "0.75rem", opacity: 0.4 }}>
            {editingId ? "edit persona" : "new persona"}
          </span>
          <button
            onClick={() => {
              setView("list")
              setError(null)
            }}
            style={btnStyle(false)}
          >
            cancel
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: "1.25rem",
              fontSize: "0.75rem",
              color: "#f87171",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}
        >
          {/* Name + slug row */}
          <div style={{ display: "flex", gap: "2rem" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                style={inputStyle}
                autoFocus
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label style={labelStyle}>prompt</label>
            <textarea
              value={form.prompt}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, prompt: e.target.value }))
              }
              style={{
                ...inputStyle,
                height: "420px",
                resize: "vertical",
                lineHeight: 1.6,
                border: "1px solid rgba(255,255,255,0.15)",
                borderBottom: "1px solid rgba(255,255,255,0.15)",
                padding: "0.75rem",
              }}
            />
          </div>

          {/* Scoring thresholds */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              paddingTop: "0.25rem",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  pass threshold
                </label>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontFamily: "monospace",
                    opacity: 0.7,
                  }}
                >
                  {fmt(form.pass_threshold)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={form.pass_threshold}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pass_threshold: parseFloat(e.target.value),
                  }))
                }
                style={{
                  width: "100%",
                  accentColor: "#4ade80",
                  cursor: "pointer",
                }}
              />
              <div
                style={{
                  fontSize: "0.65rem",
                  opacity: 0.3,
                  marginTop: "0.3rem",
                }}
              >
                minimum overall score required to pass
              </div>
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  reject threshold
                </label>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontFamily: "monospace",
                    opacity: 0.7,
                  }}
                >
                  {fmt(form.reject_threshold)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={form.reject_threshold}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    reject_threshold: parseFloat(e.target.value),
                  }))
                }
                style={{
                  width: "100%",
                  accentColor: "#f87171",
                  cursor: "pointer",
                }}
              />
              <div
                style={{
                  fontSize: "0.65rem",
                  opacity: 0.3,
                  marginTop: "0.3rem",
                }}
              >
                maximum overall score that results in a hard reject
              </div>
            </div>
          </div>

          {/* Checkboxes */}
          <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, is_active: e.target.checked }))
                }
                style={{ accentColor: "#fff" }}
              />
              <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>active</span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    is_default: e.target.checked,
                  }))
                }
                style={{ accentColor: "#fff" }}
              />
              <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>
                set as default
              </span>
            </label>
          </div>

          <div>
            <button type="submit" disabled={saving} style={btnStyle(true)}>
              {saving
                ? "saving..."
                : editingId
                  ? "save changes"
                  : "create persona"}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: "0.875rem",
      }}
    >
      {error && (
        <div
          style={{
            marginBottom: "1.25rem",
            fontSize: "0.75rem",
            color: "#f87171",
          }}
        >
          {error}
        </div>
      )}

      {sessionKind === "member" && (
        <p style={{ opacity: 0.4, fontSize: "0.78rem", marginBottom: "1.25rem", maxWidth: "36rem" }}>
          Read-only: editing personas is restricted to platform operators.
        </p>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <span
          style={{ fontSize: "0.8rem", opacity: 0.3, fontFamily: "monospace" }}
        >
          personas: {personas.length}
        </span>
        {sessionKind === "platform" && (
          <button onClick={openCreate} style={btnStyle(true)}>
            new persona
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {personas.length === 0 && (
          <div style={{ opacity: 0.2, fontSize: "0.8rem" }}>No personas.</div>
        )}

        {personas.map((p) => (
          <div
            key={p.id}
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              padding: "0.75rem 0",
              display: "flex",
              alignItems: "center",
              gap: "1.25rem",
            }}
          >
            <span style={{ flex: 1, fontSize: "0.875rem" }}>{p.name}</span>

            {p.is_default && (
              <span
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.08em",
                  color: "#4ade80",
                }}
              >
                default
              </span>
            )}

            <span
              style={{ fontSize: "0.7rem", opacity: p.is_active ? 0.5 : 0.2 }}
            >
              {p.is_active ? "active" : "inactive"}
            </span>

            <span
              style={{
                fontSize: "0.68rem",
                fontFamily: "monospace",
                opacity: 0.3,
              }}
            >
              pass {fmt(p.pass_threshold ?? 0.65)} · rej{" "}
              {fmt(p.reject_threshold ?? 0.25)}
            </span>

            <span
              style={{
                fontSize: "0.7rem",
                opacity: 0.2,
                fontFamily: "monospace",
              }}
            >
              {new Date(p.created_at).toLocaleDateString()}
            </span>

            {sessionKind === "platform" && (
              <button onClick={() => openEdit(p)} style={btnStyle(false)}>
                edit
              </button>
            )}

            {sessionKind === "platform" &&
              (deleteConfirm === p.id ? (
                <div
                  style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
                >
                  <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>
                    confirm delete?
                  </span>
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{
                      ...btnStyle(false),
                      color: "#f87171",
                      borderColor: "rgba(248,113,113,0.3)",
                    }}
                  >
                    yes
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    style={btnStyle(false)}
                  >
                    no
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setDeleteConfirm(p.id)
                    setError(null)
                  }}
                  style={{ ...btnStyle(false), opacity: 0.3 }}
                >
                  delete
                </button>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}
