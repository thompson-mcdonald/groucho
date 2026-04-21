export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterMs: number }

type Bucket = {
  windowStartMs: number
  count: number
}

const buckets: Map<string, Bucket> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((globalThis as any).__groucho_rate_limit_buckets as Map<string, Bucket> | undefined) ??
  new Map<string, Bucket>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).__groucho_rate_limit_buckets = buckets

export function checkRateLimit(opts: {
  namespace: string
  key: string
  limit: number
  windowMs: number
  nowMs?: number
}): RateLimitResult {
  const now = opts.nowMs ?? Date.now()
  const k = `${opts.namespace}:${opts.key}`

  const b = buckets.get(k)
  if (!b) {
    buckets.set(k, { windowStartMs: now, count: 1 })
    return { ok: true }
  }

  const elapsed = now - b.windowStartMs
  if (elapsed >= opts.windowMs) {
    buckets.set(k, { windowStartMs: now, count: 1 })
    return { ok: true }
  }

  if (b.count >= opts.limit) {
    return { ok: false, retryAfterMs: Math.max(0, opts.windowMs - elapsed) }
  }

  b.count += 1
  buckets.set(k, b)
  return { ok: true }
}

export function readRateLimitConfig() {
  const perApiKey = Number(process.env.GROUCHO_RL_API_KEY_PER_MINUTE ?? "60")
  const perSession = Number(process.env.GROUCHO_RL_SESSION_PER_MINUTE ?? "30")
  return {
    apiKeyPerMinute: Number.isFinite(perApiKey) ? perApiKey : 60,
    sessionPerMinute: Number.isFinite(perSession) ? perSession : 30,
  }
}

