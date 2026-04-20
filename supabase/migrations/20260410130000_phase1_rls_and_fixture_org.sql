-- Phase 1 (continued): tenant isolation for anon reads + membership RLS on org tables.
-- - `projects.expose_to_anon_read`: exactly one project (seed default) is visible to anon/authenticated
--   for conversations/messages (admin live view + Realtime) without exposing other tenants.
-- - Second org/project fixture for manual isolation checks (no rows, no anon read scope).

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS expose_to_anon_read boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.projects.expose_to_anon_read IS
  'When true, anon/authenticated clients may SELECT conversations/messages for this project (admin live view). At most one project should be true.';

UPDATE public.projects p
SET expose_to_anon_read = true
FROM public.organisations o
WHERE p.organisation_id = o.id
  AND o.slug = 'dev'
  AND p.slug = 'default';

CREATE UNIQUE INDEX IF NOT EXISTS projects_one_expose_to_anon_read
ON public.projects (expose_to_anon_read)
WHERE expose_to_anon_read;

-- ---------------------------------------------------------------------------
-- Fixture: second tenant (no expose_to_anon_read; no conversations seeded)
-- ---------------------------------------------------------------------------

INSERT INTO public.organisations (name, slug)
VALUES ('Fixture B (isolation)', 'fixture_b')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.projects (organisation_id, name, slug, expose_to_anon_read)
SELECT o.id, 'Isolated project', 'isolated', false
FROM public.organisations o
WHERE o.slug = 'fixture_b'
ON CONFLICT (organisation_id, slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Stable project id for RLS policies (SECURITY DEFINER; not exposed to clients as table data)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.anon_readable_project_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.projects p
  WHERE p.expose_to_anon_read = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.anon_readable_project_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anon_readable_project_id() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- conversations / messages: anon + authenticated SELECT scoped to public admin project
-- ---------------------------------------------------------------------------

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_select_anon_scoped
ON public.conversations
FOR SELECT
TO anon
USING (project_id = public.anon_readable_project_id());

CREATE POLICY conversations_select_authenticated_scoped
ON public.conversations
FOR SELECT
TO authenticated
USING (project_id = public.anon_readable_project_id());

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select_anon_scoped
ON public.messages
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.project_id = public.anon_readable_project_id()
  )
);

CREATE POLICY messages_select_authenticated_scoped
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.project_id = public.anon_readable_project_id()
  )
);

-- ---------------------------------------------------------------------------
-- Org plane: authenticated users see only organisations they belong to
-- ---------------------------------------------------------------------------

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY organisations_select_member
ON public.organisations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organisation_members m
    WHERE m.organisation_id = organisations.id
      AND m.user_id = (SELECT auth.uid())
  )
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_select_member
ON public.projects
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organisation_members m
    WHERE m.organisation_id = projects.organisation_id
      AND m.user_id = (SELECT auth.uid())
  )
);

ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY organisation_members_select_self
ON public.organisation_members
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
