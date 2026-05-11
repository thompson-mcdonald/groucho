import type { NextRequest } from "next/server"

/** Incoming (W3C-style); echoed on responses for log correlation. */
export const REQUEST_ID_HEADER = "x-request-id"

export function getRequestIdFromHeaders(headers: Headers): string | undefined {
  const a = headers.get(REQUEST_ID_HEADER)?.trim()
  if (a) return a
  const b = headers.get("x-correlation-id")?.trim()
  if (b) return b
  return undefined
}

export function getRequestId(req: NextRequest | Request): string {
  return getRequestIdFromHeaders(req.headers) ?? ""
}

/** Prefer header from middleware; otherwise generate (e.g. tests). */
export function getOrCreateRequestId(req: NextRequest | Request): string {
  return getRequestId(req) || crypto.randomUUID()
}
