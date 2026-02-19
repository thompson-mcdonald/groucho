import LiveConversations from "@/components/admin/LiveConversations"

export default function AdminPage() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <div
        style={{
          padding: "1.25rem 2rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
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
      </div>
      <LiveConversations />
    </div>
  )
}
