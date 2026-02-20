import Link from "next/link"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <div
        style={{
          padding: "1.25rem 2rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: "2rem",
        }}
      >
        <span
          style={{
            fontSize: "0.7rem",
            letterSpacing: "0.12em",
            opacity: 0.3,
          }}
        >
          PUBLIC EQUITY™ / ADMIN
        </span>
        <nav
          style={{
            display: "flex",
            gap: "1rem",
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
            conversations
          </Link>
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
        </nav>
      </div>
      {children}
    </div>
  )
}
