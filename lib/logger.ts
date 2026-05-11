/**
 * Minimal structured logging for serverless (one JSON object per line).
 * Never pass secrets or full API keys — use `apiKeyId` or key prefix only.
 */
export type LogFields = Record<string, unknown>

function line(level: string, msg: string, fields?: LogFields) {
  const payload: Record<string, unknown> = {
    level,
    msg,
    ts: new Date().toISOString(),
    ...fields,
  }
  const s = JSON.stringify(payload)
  if (level === "error") console.error(s)
  else if (level === "warn") console.warn(s)
  else console.log(s)
}

export const log = {
  info(msg: string, fields?: LogFields) {
    line("info", msg, fields)
  },
  warn(msg: string, fields?: LogFields) {
    line("warn", msg, fields)
  },
  error(msg: string, fields?: LogFields) {
    line("error", msg, fields)
  },
}
