import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"
import { verifyPeAuthEmail, isAllowedPlatformEmail } from "@/lib/pe-auth"

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/",
  "/invite",
  "/api/invitations/",
  "/signup",
  "/api/organisations/signup",
  "/api/me/",
]
const STATIC_PREFIXES = ["/_next/", "/favicon.ico"]

function authFailure(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.redirect(new URL("/login", req.url))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next()
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const secret = process.env.AUTH_SECRET
  if (!secret) {
    console.error("AUTH_SECRET env var is not set")
    return authFailure(req)
  }

  const token = req.cookies.get("pe_auth")?.value
  if (token) {
    const email = await verifyPeAuthEmail(token, secret)
    if (email && isAllowedPlatformEmail(email)) {
      return NextResponse.next()
    }
  }

  let res = NextResponse.next({ request: { headers: req.headers } })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (url && anon) {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        },
      },
    })
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      return res
    }
  }

  if (token) {
    const clear = authFailure(req)
    clear.cookies.delete("pe_auth")
    return clear
  }

  return authFailure(req)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
