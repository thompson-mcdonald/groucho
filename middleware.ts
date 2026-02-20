import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS = ["/login", "/api/auth/"]
const STATIC_PREFIXES = ["/_next/", "/favicon.ico"]

async function verifyToken(token: string, secret: string): Promise<string | null> {
  try {
    const [payloadB64, sigB64] = token.split(".")
    if (!payloadB64 || !sigB64) return null

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    )

    const sigBytes = Uint8Array.from(atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payloadB64))
    if (!valid) return null

    const payload = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
    const [email] = payload.split("|")
    return email || null
  } catch {
    return null
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next()
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get("pe_auth")?.value
  const secret = process.env.AUTH_SECRET

  if (!secret) {
    console.error("AUTH_SECRET env var is not set")
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const email = await verifyToken(token, secret)
  if (!email) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const allowed = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
  if (!allowed.includes(email.toLowerCase())) {
    const res = NextResponse.redirect(new URL("/login", req.url))
    res.cookies.delete("pe_auth")
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
