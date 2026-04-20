/** Lowercase slug: letters, digits, hyphens; non-empty or null if invalid. */
export function normalizeAdminSlug(input: string): string | null {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return s.length > 0 ? s : null
}
