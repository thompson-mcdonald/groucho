import { createHash, randomBytes } from "crypto"

/** New random gatekeeper key (plaintext). Store only `hashApiKeySecret` in DB. */
export function generateGatekeeperApiKey(): string {
  return `gk_${randomBytes(24).toString("base64url")}`
}

export function hashApiKeySecret(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex")
}

export function apiKeyPrefix(key: string): string {
  return key.length >= 12 ? key.slice(0, 12) : key
}
