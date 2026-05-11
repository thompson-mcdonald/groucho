import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import {
  REQUEST_ID_HEADER,
  getRequestIdFromHeaders,
} from "@/lib/request-trace"

type HasHeaders = { headers: Headers }

/**
 * Middleware helper: forward or mint `x-request-id` on the request and echo on the response.
 */
export function nextWithRequestId(req: NextRequest): NextResponse {
  const existing = getRequestIdFromHeaders(req.headers)
  const id = existing ?? crypto.randomUUID()
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set(REQUEST_ID_HEADER, id)
  const res = NextResponse.next({ request: { headers: requestHeaders } })
  res.headers.set(REQUEST_ID_HEADER, id)
  return res
}

/** Attach `x-request-id` to a handler response if not already set. */
export function attachRequestId(req: HasHeaders, res: NextResponse): NextResponse {
  const id = getRequestIdFromHeaders(req.headers) ?? crypto.randomUUID()
  if (!res.headers.get(REQUEST_ID_HEADER)) {
    res.headers.set(REQUEST_ID_HEADER, id)
  }
  return res
}

export function tracedJson(
  req: HasHeaders,
  body: unknown,
  init?: ResponseInit,
): NextResponse {
  return attachRequestId(req, NextResponse.json(body, init))
}
