# Groucho v1 — GitHub / Linear issue breakdown

Copy titles into issues; **Epic** labels: `phase-0` … `phase-6`. **Depends on** links use GitHub “blocked by” or Linear relations.

Reference docs: [PRD.md](./PRD.md), [schema-migration.md](./schema-migration.md), [api/openapi.yaml](./api/openapi.yaml), [sdk-surface.md](./sdk-surface.md).

---

## Phase 0 — Baseline (documentation / freeze) — **complete**

| Title | Type | Description |
|-------|------|---------------|
| Document Phase 0 reference implementation | chore | Link doorcheck, `/api/chat`, `/api/access`, admin live view, scoring; tag release `demo-0.x`. |
| Pin Anthropic model + env vars in README | docs | List required env for reproducible demo (no secrets). |

**Depends on:** nothing.

---

## Phase 1 — Multi-tenant data plane — **feature complete**

| Title | Type | Status | Description |
|-------|------|--------|-------------|
| Migration: organisations + members + invitations | feature | done | Tables per PRD; seed migration for dev single-tenant backfill. |
| Migration: projects + api_keys | feature | done | `key_hash`, `key_prefix`, `revoked_at`, FK to org. |
| Migration: add org_id/project_id to sessions/messages | feature | done | Nullable → backfill → NOT NULL on `sessions` (formerly `conversations`); see [schema-migration.md](./schema-migration.md). |
| RLS policies: org isolation | feature | done | `api_keys` RLS (no policies — blocks anon); `sessions`/`messages` SELECT for anon/authenticated scoped to `projects.expose_to_anon_read`; org/member/invitation tables RLS for authenticated; second-org fixture `fixture_b` / `isolated`. |
| Service-role chat path: resolve project from API key | feature | done | `lib/project-resolution.ts` + `/api/chat` + `/api/access` default project scope; optional `GROUPCHO_REQUIRE_API_KEY` / `GROUPCHO_DEFAULT_PROJECT_ID`. |
| Rename `conversations` → `sessions` (optional) | chore | done | Migration `20260410140000_rename_conversations_to_sessions.sql`; `messages.session_id`; app + admin realtime updated. |

**Depends on:** Phase 0 doc complete (soft).  
**Blocks:** Phase 2.

---

## Phase 2 — Platform MVP (control plane) — **feature complete**

| Title | Type | Status | Description |
|-------|------|--------|-------------|
| Auth: org signup + invite accept flow | feature | done | **Invites** + **self-serve** as before. **Org console:** middleware allows `/admin` + `/api/admin/*` with Supabase session or `pe_auth`; `resolveAdminActor()` + `requireOrgMember` / `requireOrgAdmin` / `requireOrgOwner` / `requirePlatform` on routes. **`GET /api/admin/session`**. **`POST /api/auth/logout`** clears `pe_auth` + `signOut()` Supabase. Migration `20260421130000_sessions_rls_org_members.sql` — authenticated users read sessions/messages for projects in orgs they belong to. |
| UI: organisation settings (name, slug, members) | feature | done | **`/admin/organisations`** — platform-only create org; members see their orgs only. Org detail uses **`GET /api/admin/organisations/[orgId]/access`** — member read-only vs admin vs owner (delete org / invite owner). **Personas** nav + mutations platform-only; members read list at `/admin/personas`. **LiveConversations** uses `createSupabaseBrowserClient()` so JWT + RLS apply. |
| UI: Multi-step project wizard | feature | done | **`/admin/organisations/[orgId]/projects/new`** — scope, gate behaviour, optional webhook fields (stored in `projects.settings`), review, create + API key ceremony; “Guided setup” link on org detail. See [platform-project-wizard.md](./platform-project-wizard.md). |
| UI: API keys list + revoke + last used | feature | done | Org detail → project: list, create (secret once), revoke via `/api/admin/.../api-keys`. |
| UI: Project-scoped session list (read-only) | feature | done | Org detail → project: session list + **transcript** (`GET .../sessions/[sessionId]/messages`). |

**Depends on:** Phase 1 migrations + key resolution (full tenant RLS can land during Phase 2).  
**Blocks:** Phase 3.

---

## Phase 3 — Public project API — **in progress**

| Title | Type | Status | Description |
|-------|------|--------|-------------|
| Mount OpenAPI contract under `/v1` | feature | done | **`POST /v1/sessions/{sessionId}/messages`**, **`GET /v1/sessions/{sessionId}`**, **`POST /v1/sessions/{sessionId}/access`** ([docs/api/openapi.yaml](./api/openapi.yaml)). Shared handler [`lib/post-session-message.ts`](../lib/post-session-message.ts); `POST /api/chat` unchanged. Middleware allows `/v1/`. |
| Contract tests: PostMessage 200/409/503 | test | done | `vitest` module-mocked contract tests: `lib/__tests__/contract-post-message.test.ts` (200/409/503 + 429). |
| Rate limit: per API key + per session | feature | done | Lightweight in-memory limiter in `lib/rate-limit.ts` enforced by `lib/post-session-message.ts` (per api key + per project/session) and `/v1/.../access` (429 + `Retry-After`). Env: `GROUCHO_RL_API_KEY_PER_MINUTE`, `GROUCHO_RL_SESSION_PER_MINUTE`. |
| Normalise outcome enum PASS/REDIRECT/REJECT | chore | Single mapper from model strings + thresholds. |

**Depends on:** Phase 1 key resolution.  
**Blocks:** Phase 5 (SDK against stable API).

---

## Phase 4 — Webhooks + verdicts — **in progress**

| Title | Type | Status | Description |
|-------|------|--------|-------------|
| Migration: webhooks + verdicts tables | feature | done | `20260422120000_phase4_webhooks_verdicts.sql` — `webhooks`, `verdicts` (one per session), `webhook_deliveries`; service_role grants; HTTPS URL check. |
| Worker: deliver webhook with HMAC + retries | feature | done | `lib/verdict-webhook.ts` — HMAC-SHA256 body signature, `GET /api/cron/webhook-deliveries` + `CRON_SECRET` drains pending queue with backoff + max attempts. |
| UI: webhook CRUD under project | feature | done | Org project panel: list, add (secret once), toggle active, rotate secret, test ping, delete; admin API under `/api/admin/.../projects/[projectId]/webhooks`. |
| Event payload schema v1 | docs | done | [event-payload-session-completed.schema.json](./event-payload-session-completed.schema.json) for `session.completed`. |

**Depends on:** Phase 3 session completion path emits verdict row.  
**Blocks:** Phase 6 hardening (partially).

---

## Phase 5 — `@groucho/sdk` v1

| Title | Type | Description |
|-------|------|---------------|
| Monorepo: `packages/sdk` scaffold | chore | tsup or unbuild; exports map from [sdk-surface.md](./sdk-surface.md). |
| Implement `createClient` + types from OpenAPI | feature | `openapi-typescript` codegen in CI. |
| Implement `Gatekeeper` + primitives | feature | Dark theme tokens; a11y baseline. |
| Example: `examples/next-groucho` with proxy route | docs | Implements ADR-0001 default pattern. |
| Publish npm (private or public) | chore | Changesets or semantic-release. |

**Depends on:** Phase 3 OpenAPI stable (can stub until then).  
**Parallel with:** Phase 4 optional.

---

## Phase 6 — Hardening

| Title | Type | Description |
|-------|------|---------------|
| Observability: structured logs + trace ids | feature | Correlate session, project, request id. |
| Load test: chat path k6 | test | SLO draft from PRD NFR. |
| Backup + retention policy doc | docs | GDPR / delete org cascade. |
| Security review checklist | docs | RLS, keys, webhooks, rate limits. |

**Depends on:** Phases 1–4 in place.

---

## Phase 7 — v1.5+ (backlog epics)

| Title | Type | Description |
|-------|------|---------------|
| BYO LLM keys (encrypted, server-only routing) | feature | Per org/project; never browser. |
| Billing: Stripe customer + metered usage | feature | Stub hooks from PRD. |
| Admin: stats header + CSV export | feature | [03-admin-dashboard.md](../prompts/03-admin-dashboard.md) bonus. |
| Streaming responses (optional) | spike | AI SDK vs DB consistency ADR. |

---

## Suggested first sprint (after Phase 1 merge)

1. Migration: organisations + members (minimal).  
2. Migration: projects + api_keys + backfill single dev org/project.  
3. RLS smoke tests.  
4. Internal only: project picker in existing admin.

---

## Labels (suggested)

`area/platform`, `area/api`, `area/sdk`, `area/db`, `type/feature`, `type/chore`, `type/docs`, `priority/p0`
