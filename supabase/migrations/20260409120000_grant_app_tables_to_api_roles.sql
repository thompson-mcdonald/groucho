-- Ensure PostgREST API roles can access app tables.
-- Fixes: SQLSTATE 42501 "permission denied for table conversations/sessions" when the
-- migration owner differs from default Supabase grants (e.g. custom reset paths).

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profile_eligibility TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.personas TO service_role;

-- anon / authenticated: read patterns used by admin realtime + optional client reads;
-- inserts to sessions/messages go through service_role in this repo’s API routes (table renamed in 20260410140000_*).
GRANT SELECT ON TABLE public.conversations TO anon, authenticated;
GRANT SELECT ON TABLE public.messages TO anon, authenticated;
GRANT SELECT ON TABLE public.personas TO anon, authenticated;
