import { NextRequest, NextResponse } from "next/server"

async function proxy(req: NextRequest, pathSegments: string[]) {
  const upstreamBase =
    process.env.GROUPCHO_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:3000"
  const key = process.env.GROUPCHO_API_KEY
  if (!key) {
    return NextResponse.json(
      { error: "GROUPCHO_API_KEY is not set on the host" },
      { status: 500 },
    )
  }

  const pathPart = pathSegments.join("/")
  const url = new URL(`${upstreamBase}/${pathPart}`)
  url.search = req.nextUrl.search

  const headers = new Headers(req.headers)
  headers.delete("host")
  headers.set("Authorization", `Bearer ${key}`)

  const init: RequestInit = {
    method: req.method,
    headers,
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer()
  }

  const res = await fetch(url, init)

  const out = new NextResponse(res.body, { status: res.status })
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return
    out.headers.set(key, value)
  })
  return out
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params
  return proxy(req, path)
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params
  return proxy(req, path)
}
