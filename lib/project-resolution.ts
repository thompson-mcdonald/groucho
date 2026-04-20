import { hashApiKeySecret } from "@/lib/api-keys"
import { supabase } from "@/lib/supabase"

export type ProjectContext = {
  organisationId: string
  projectId: string
  apiKeyId: string | null
}

/** Plaintext of the dev seed key in `20260410120000_phase1_multitenant_core.sql`. */
export const DEV_SEED_API_KEY = "gk_test_local_dev_secret_key"

function parseBearer(authorization: string | null): string | null {
  if (!authorization) return null
  const m = /^Bearer\s+(\S+)$/i.exec(authorization.trim())
  return m?.[1] ?? null
}

/**
 * Resolves org + project for a chat request.
 * - If `Authorization: Bearer gk_*` is present, looks up `api_keys.key_hash` (SHA-256 hex of the full token).
 * - Otherwise prefers `projects.expose_to_anon_read` (seed default; aligns with admin RLS), then the
 *   first project by `created_at`, unless `GROUPCHO_REQUIRE_API_KEY=true`.
 */
export async function resolveProjectContext(
  authorization: string | null,
): Promise<
  | { ok: true; context: ProjectContext }
  | { ok: false; status: number; body: { error: string } }
> {
  const token = parseBearer(authorization)
  if (token) {
    const hash = hashApiKeySecret(token)
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, organisation_id, project_id")
      .eq("key_hash", hash)
      .is("revoked_at", null)
      .maybeSingle()

    if (error) {
      console.error("api_keys lookup error:", error)
      return { ok: false, status: 500, body: { error: "Database error" } }
    }
    if (!data) {
      return { ok: false, status: 401, body: { error: "Invalid API key" } }
    }
    return {
      ok: true,
      context: {
        organisationId: data.organisation_id,
        projectId: data.project_id,
        apiKeyId: data.id,
      },
    }
  }

  if (process.env.GROUPCHO_REQUIRE_API_KEY === "true") {
    return { ok: false, status: 401, body: { error: "Missing Authorization" } }
  }

  const envProjectId = process.env.GROUPCHO_DEFAULT_PROJECT_ID?.trim()
  if (envProjectId) {
    const { data: row, error } = await supabase
      .from("projects")
      .select("id, organisation_id")
      .eq("id", envProjectId)
      .maybeSingle()
    if (error || !row) {
      console.error("GROUPCHO_DEFAULT_PROJECT_ID lookup:", error)
      return {
        ok: false,
        status: 500,
        body: { error: "Server misconfigured: default project id invalid" },
      }
    }
    return {
      ok: true,
      context: {
        organisationId: row.organisation_id,
        projectId: row.id,
        apiKeyId: null,
      },
    }
  }

  const { data: anonReadProject, error: arErr } = await supabase
    .from("projects")
    .select("id, organisation_id")
    .eq("expose_to_anon_read", true)
    .limit(1)
    .maybeSingle()

  if (!arErr && anonReadProject) {
    return {
      ok: true,
      context: {
        organisationId: anonReadProject.organisation_id,
        projectId: anonReadProject.id,
        apiKeyId: null,
      },
    }
  }
  if (arErr) {
    console.warn("expose_to_anon_read project lookup:", arErr)
  }

  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("id, organisation_id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (pErr || !project) {
    console.error("default project lookup:", pErr)
    return {
      ok: false,
      status: 500,
      body: { error: "Server misconfigured: no default project" },
    }
  }

  return {
    ok: true,
    context: {
      organisationId: project.organisation_id,
      projectId: project.id,
      apiKeyId: null,
    },
  }
}

export function touchApiKeyLastUsed(apiKeyId: string): void {
  void supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKeyId)
    .then(({ error }) => {
      if (error) console.warn("api_keys last_used_at:", error)
    })
}

/** For routes that only have `session_id` (e.g. access gate) without API key context. */
export async function getDefaultProjectId(): Promise<
  { ok: true; projectId: string } | { ok: false; status: number; body: { error: string } }
> {
  const resolved = await resolveProjectContext(null)
  if (!resolved.ok) return resolved
  return { ok: true, projectId: resolved.context.projectId }
}
