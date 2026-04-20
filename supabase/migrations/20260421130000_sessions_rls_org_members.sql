-- Allow authenticated Supabase users to read sessions/messages for projects in orgs they belong to
-- (in addition to the existing anon-readable demo project).

DROP POLICY IF EXISTS sessions_select_authenticated_scoped ON public.sessions;

CREATE POLICY sessions_select_authenticated_scoped
ON public.sessions
FOR SELECT
TO authenticated
USING (
  project_id = public.anon_readable_project_id()
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    INNER JOIN public.organisation_members om ON om.organisation_id = p.organisation_id
    WHERE p.id = sessions.project_id
      AND om.user_id = auth.uid()
      AND om.accepted_at IS NOT NULL
  )
);

DROP POLICY IF EXISTS messages_select_authenticated_scoped ON public.messages;

CREATE POLICY messages_select_authenticated_scoped
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.id = messages.session_id
      AND (
        s.project_id = public.anon_readable_project_id()
        OR EXISTS (
          SELECT 1
          FROM public.projects p
          INNER JOIN public.organisation_members om ON om.organisation_id = p.organisation_id
          WHERE p.id = s.project_id
            AND om.user_id = auth.uid()
            AND om.accepted_at IS NOT NULL
        )
      )
  )
);
