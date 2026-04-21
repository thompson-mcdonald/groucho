/** Normalised terminal outcome for APIs and SDK (OpenAPI `Session.outcome`). */
export type SessionOutcomeLabel = "PASS" | "REDIRECT" | "REJECT"

/**
 * Map DB `sessions.status` to a coarse outcome label. `active` and unknown → null.
 */
export function outcomeLabelFromDbStatus(
  status: string | null | undefined,
): SessionOutcomeLabel | null {
  switch (status) {
    case "passed":
      return "PASS"
    case "redirected":
      return "REDIRECT"
    case "rejected":
    case "failed":
      return "REJECT"
    default:
      return null
  }
}
