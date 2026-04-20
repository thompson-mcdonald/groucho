# ADR 0001: API key handling and browser vs server access

**Status:** Accepted (draft for implementation)  
**Date:** 2026-04-08  
**Deciders:** Product / Engineering  
**Tags:** security, sdk, api-keys

## Context

Groucho issues **project API keys** (`gk_live_*`, `gk_test_*`) that identify an organisation + project and authorise the **chat/session HTTP API**. Integrators may:

1. **Embed** the Gatekeeper UI in a browser (React SPA, marketing site).
2. **Call** the API from a **trusted server** (Next.js Route Handler, Rails, Edge function).

Browser-exposed secrets are vulnerable to extraction (view source, compromised dependency, XSS). At the same time, pure server-side integration adds friction for static sites and prototypes.

We need a **default recommendation** and **supported alternatives** documented for the SDK and PRD.

## Decision

### Primary pattern (recommended for production)

**Host-server proxy with secret key**

- The **full** `gk_live_*` / `gk_test_*` secret exists only on the host’s **server** (environment variable, secret manager).
- The browser never sees the Groucho project key.
- The browser obtains a **short-lived, scoped session token** from the host:
  - e.g. `POST /api/groucho/session` on the host → host validates its own user (cookie/session) → host calls Groucho `POST /v1/sessions` with Bearer `gk_*` → returns `{ grouchoSessionToken, expiresAt }` to the browser.
- Subsequent chat calls from the browser go to **`POST /api/groucho/messages`** (host), which forwards to Groucho with the **server-held** key and attaches `X-Groucho-Session-Id` (or equivalent).

**Properties:** Key never leaves host infra; Groucho can rate-limit by host origin + key; revoking key is sufficient.

### Secondary pattern (documented, higher risk)

**Browser-direct with live key**

- Integrator configures `NEXT_PUBLIC_GROUPCHO_KEY` or passes key into `createClient({ apiKey })` in client bundles.
- **Requirements if used:** Groucho API must enforce **strict CORS** allowlists per project, **aggressive rate limits**, **key rotation** UX in platform, and documentation that **any XSS = full key compromise**.
- **Test keys** (`gk_test_*`) may be used in preview/staging only; discourage `gk_live_*` in client bundles in docs and CLI warnings.

### Short-lived tokens (Groucho-issued, optional v1.1)

Optionally Groucho may issue **first-party** opaque tokens returned from `POST /v1/sessions` that are **not** the API key, valid for e.g. 1 hour, bound to `session_id` + `project_id`. That reduces host proxy surface while still avoiding long-lived keys in the browser. This ADR **does not require** v1 to implement Groucho-issued tokens if the host-proxy pattern is sufficient.

## Consequences

### Positive

- Clear security story for enterprise sales and security review.
- SDK can ship `createServerClient` / `createBrowserClient` helpers that encode the recommended flow.

### Negative

- More boilerplate for static sites (must add one server route).
- Documentation burden: two patterns to test and maintain.

## Alternatives considered

| Alternative | Why not chosen as default |
|-------------|---------------------------|
| Only browser key | Unacceptable security posture for production. |
| mTLS from browser | Not practical for typical web apps. |
| OAuth end-user per applicant | Overkill for anonymous gate; session id + host auth is enough. |

## Implementation notes

- OpenAPI / SDK: document **recommended** env vars: `GROUPCHO_API_KEY` (server only), `NEXT_PUBLIC_GROUPCHO_PROJECT_ID` (optional, public id only — not the secret).
- Platform UI: warn when user copies live key: “Do not expose in client-side code.”
- Logging: middleware must never log full `Authorization` header.

## References

- [docs/PRD.md](../PRD.md) §9  
- [docs/sdk-surface.md](../sdk-surface.md)  
