import { NextResponse } from "next/server"

/** Self-contained example — no auth (contrast with repo root `middleware.ts`). */
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
