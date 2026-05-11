/**
 * Lightweight validation for the persona-level profile schema:
 *
 *   { "type": "object", "properties": { ...: { type, description?, "x-pii"?: true } } }
 *
 * We deliberately do NOT meta-validate the JSON Schema in v1 (per plan): we only
 * enforce shape so the extractor can use `properties` keys safely.
 */

export type ParsedProfileSchema =
  | { ok: true; value: null }
  | { ok: true; value: { type: "object"; properties: Record<string, Record<string, unknown>> } }
  | { ok: false; error: string }

export function parseProfileSchemaInput(raw: unknown): ParsedProfileSchema {
  if (raw === null || raw === undefined || raw === "") {
    return { ok: true, value: null }
  }

  let value: unknown = raw
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (trimmed === "") return { ok: true, value: null }
    try {
      value = JSON.parse(trimmed)
    } catch (e) {
      return {
        ok: false,
        error: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
      }
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "profile_schema must be a JSON object." }
  }

  const obj = value as Record<string, unknown>
  if (obj.type !== "object") {
    return { ok: false, error: 'profile_schema must declare "type": "object".' }
  }
  if (!obj.properties || typeof obj.properties !== "object" || Array.isArray(obj.properties)) {
    return { ok: false, error: "profile_schema.properties must be an object." }
  }

  const propsIn = obj.properties as Record<string, unknown>
  const properties: Record<string, Record<string, unknown>> = {}
  for (const [key, defRaw] of Object.entries(propsIn)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      return { ok: false, error: `Invalid property name: "${key}".` }
    }
    if (!defRaw || typeof defRaw !== "object" || Array.isArray(defRaw)) {
      return { ok: false, error: `Property "${key}" must be an object.` }
    }
    properties[key] = defRaw as Record<string, unknown>
  }

  return {
    ok: true,
    value: { type: "object", properties },
  }
}

export function normaliseExtractorHint(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null
  return trimmed.slice(0, 2000)
}
