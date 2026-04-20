-- Rename conversations → sessions; messages.conversation_id → messages.session_id (FK to sessions.id).
-- profile_eligibility.conversation_id → session_id for consistency.

-- ---------------------------------------------------------------------------
-- Realtime: remove old table name before rename (publication stores by OID; DROP by name is safe here)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.conversations;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- RLS policies reference old table/column names — drop and recreate after rename
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS conversations_select_anon_scoped ON public.conversations;
DROP POLICY IF EXISTS conversations_select_authenticated_scoped ON public.conversations;
DROP POLICY IF EXISTS messages_select_anon_scoped ON public.messages;
DROP POLICY IF EXISTS messages_select_authenticated_scoped ON public.messages;

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;

-- ---------------------------------------------------------------------------
-- Child columns + table rename (FKs follow sessions OID)
-- ---------------------------------------------------------------------------

ALTER TABLE public.messages
  RENAME COLUMN conversation_id TO session_id;

ALTER INDEX public.idx_messages_conversation_id
  RENAME TO idx_messages_session_id;

ALTER TABLE public.profile_eligibility
  RENAME COLUMN conversation_id TO session_id;

ALTER TABLE public.conversations
  RENAME TO sessions;

ALTER INDEX public.idx_conversations_session_id
  RENAME TO idx_sessions_session_id;

ALTER INDEX public.idx_conversations_status
  RENAME TO idx_sessions_status;

ALTER TABLE public.sessions
  RENAME CONSTRAINT conversations_pkey TO sessions_pkey;

ALTER TABLE public.sessions
  RENAME CONSTRAINT conversations_status_check TO sessions_status_check;

ALTER TABLE public.sessions
  RENAME CONSTRAINT conversations_project_session_unique TO sessions_project_session_unique;

ALTER TABLE public.messages
  RENAME CONSTRAINT messages_conversation_id_fkey TO messages_session_id_fkey;

DO $$
BEGIN
  ALTER TABLE public.profile_eligibility
    RENAME CONSTRAINT profile_eligibility_conversation_id_fkey TO profile_eligibility_session_id_fkey;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.profile_eligibility
    RENAME CONSTRAINT profile_eligibility_profile_id_conversation_id_key TO profile_eligibility_profile_id_session_id_key;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Realtime: register new table name
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime' AND puballtables = true
  ) THEN
    -- `messages` remains in the publication from the initial migration; only add `sessions`.
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Grants follow the table OID through RENAME; re-assert for clarity and for tools that expect `sessions`.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sessions TO service_role;
GRANT SELECT ON TABLE public.sessions TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS (same rules as before; table/column names updated)
-- ---------------------------------------------------------------------------

CREATE POLICY sessions_select_anon_scoped
ON public.sessions
FOR SELECT
TO anon
USING (project_id = public.anon_readable_project_id());

CREATE POLICY sessions_select_authenticated_scoped
ON public.sessions
FOR SELECT
TO authenticated
USING (project_id = public.anon_readable_project_id());

CREATE POLICY messages_select_anon_scoped
ON public.messages
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.id = messages.session_id
      AND s.project_id = public.anon_readable_project_id()
  )
);

CREATE POLICY messages_select_authenticated_scoped
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.id = messages.session_id
      AND s.project_id = public.anon_readable_project_id()
  )
);
