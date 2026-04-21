-- Phase 4: webhooks + verdicts + delivery queue (service_role only via RLS lockdown).

CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  label text,
  url text NOT NULL,
  signing_secret text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['session.completed']::text[],
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhooks_url_https CHECK (url ~ '^https://')
);

CREATE INDEX idx_webhooks_project_active ON public.webhooks (project_id) WHERE active = true;

CREATE TABLE public.verdicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  outcome text NOT NULL CHECK (outcome IN ('PASS', 'REDIRECT', 'REJECT')),
  session_status text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verdicts_one_per_session UNIQUE (session_id)
);

CREATE INDEX idx_verdicts_project_created ON public.verdicts (project_id, created_at DESC);

CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.webhooks (id) ON DELETE CASCADE,
  verdict_id uuid NOT NULL REFERENCES public.verdicts (id) ON DELETE CASCADE,
  attempt_count int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 8,
  next_retry_at timestamptz,
  last_error text,
  status text NOT NULL CHECK (status IN ('pending', 'delivered', 'failed')) DEFAULT 'pending',
  http_status int,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_deliveries_unique UNIQUE (webhook_id, verdict_id)
);

CREATE INDEX idx_webhook_deliveries_pending ON public.webhook_deliveries (status, next_retry_at)
  WHERE status = 'pending';

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verdicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.webhooks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.verdicts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.webhook_deliveries TO service_role;
