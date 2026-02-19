import Link from "next/link";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
      }}
    >
      <p style={{ letterSpacing: "0.15em", fontSize: "0.875rem" }}>
        PUBLIC EQUITY™
      </p>
      <p
        style={{
          letterSpacing: "0.1em",
          fontSize: "0.75rem",
          opacity: 0.5,
        }}
      >
        BUYING POWER
      </p>
      <Link
        href="/doorcheck"
        style={{
          marginTop: "2rem",
          fontSize: "0.75rem",
          letterSpacing: "0.1em",
          opacity: 0.6,
          textDecoration: "none",
          color: "#fff",
        }}
      >
        Enter
      </Link>
    </div>
  );
}
