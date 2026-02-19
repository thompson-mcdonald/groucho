"use client";

import { useState } from "react";

export default function Access() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    // Placeholder — wire up later
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
    }, 0);
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
        >
          <label
            style={{ fontSize: "0.875rem", letterSpacing: "0.05em" }}
          >
            Email.
          </label>
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
  );
}
