-- Wizard / gate metadata (use case, environment, persona choice, optional webhook stub, etc.)

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.projects.settings IS
  'Product-defined JSON: use_case, environment, session_mode, persona_id, webhook_url, webhook_events, thresholds, etc.';
