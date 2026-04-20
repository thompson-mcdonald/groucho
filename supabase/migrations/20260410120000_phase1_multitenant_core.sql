-- Phase 1: multi-tenant core (organisations → projects → api_keys) + link conversations/messages.
-- Seeds a single dev org/project + one test API key (see docs/database-setup.md).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Tenancy tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, slug)
);

CREATE INDEX idx_projects_organisation_id ON public.projects (organisation_id);

CREATE TABLE public.organisation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  invited_by uuid REFERENCES auth.users (id),
  invited_at timestamptz,
  accepted_at timestamptz,
  UNIQUE (organisation_id, user_id)
);

CREATE INDEX idx_organisation_members_user_id ON public.organisation_members (user_id);

CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES auth.users (id),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz
);

CREATE INDEX idx_invitations_organisation_id ON public.invitations (organisation_id);

CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  label text,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX idx_api_keys_project_id ON public.api_keys (project_id);

-- ---------------------------------------------------------------------------
-- Link conversations + messages to a project (backfill then NOT NULL)
-- ---------------------------------------------------------------------------

ALTER TABLE public.conversations
  ADD COLUMN organisation_id uuid REFERENCES public.organisations (id) ON DELETE CASCADE,
  ADD COLUMN project_id uuid REFERENCES public.projects (id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD COLUMN organisation_id uuid REFERENCES public.organisations (id) ON DELETE CASCADE,
  ADD COLUMN project_id uuid REFERENCES public.projects (id) ON DELETE CASCADE;

-- Seed dev org + default project (single-tenant bootstrap for existing installs)
INSERT INTO public.organisations (name, slug)
VALUES ('Development', 'dev');

INSERT INTO public.projects (organisation_id, name, slug)
SELECT id, 'Default gate', 'default'
FROM public.organisations
WHERE slug = 'dev';

-- Full API key string (must match lib/project-resolution.ts dev fallback for hash verification)
INSERT INTO public.api_keys (
  organisation_id,
  project_id,
  key_hash,
  key_prefix,
  label
)
SELECT
  o.id,
  p.id,
  encode(extensions.digest('gk_test_local_dev_secret_key'::text, 'sha256'), 'hex'),
  'gk_test_',
  'Phase 1 local seed — rotate in production'
FROM public.organisations o
JOIN public.projects p ON p.organisation_id = o.id
WHERE o.slug = 'dev'
  AND p.slug = 'default';

UPDATE public.conversations c
SET
  organisation_id = o.id,
  project_id = p.id
FROM public.organisations o
JOIN public.projects p ON p.organisation_id = o.id
WHERE o.slug = 'dev'
  AND p.slug = 'default'
  AND c.organisation_id IS NULL;

UPDATE public.messages m
SET
  organisation_id = c.organisation_id,
  project_id = c.project_id
FROM public.conversations c
WHERE m.conversation_id = c.id
  AND m.organisation_id IS NULL;

ALTER TABLE public.conversations
  ALTER COLUMN organisation_id SET NOT NULL,
  ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE public.messages
  ALTER COLUMN organisation_id SET NOT NULL,
  ALTER COLUMN project_id SET NOT NULL;

-- Session id is unique per project (not globally), so two projects can reuse the same client id.
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_session_id_key;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_project_session_unique UNIQUE (project_id, session_id);

-- ---------------------------------------------------------------------------
-- Grants (PostgREST roles)
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organisations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organisation_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invitations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.api_keys TO service_role;

GRANT SELECT ON TABLE public.organisations TO anon, authenticated;
GRANT SELECT ON TABLE public.projects TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS: lock down secrets; service_role still bypasses RLS on Supabase.
-- Conversations/messages stay without RLS for now so anon admin realtime keeps working.
-- ---------------------------------------------------------------------------

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
