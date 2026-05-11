-- Profile v1: per-persona profile_schema (JSON Schema, optional) + extractor hint.
-- See docs/profile-payload.schema.json and docs/profile-schema-guide.md.

ALTER TABLE public.personas
  ADD COLUMN IF NOT EXISTS profile_schema jsonb NULL,
  ADD COLUMN IF NOT EXISTS profile_extractor_hint text NULL;

COMMENT ON COLUMN public.personas.profile_schema IS
  'Optional JSON Schema (type: object, properties: {...}) declaring custom profile fields extracted on session completion. Properties may use the convention "x-pii": true to flag PII for redaction in logs and admin masking. See docs/profile-payload.schema.json.';

COMMENT ON COLUMN public.personas.profile_extractor_hint IS
  'Optional short hint appended to the system prompt of the profile-extraction call. Distinct from personas.prompt which steers the conversation.';
