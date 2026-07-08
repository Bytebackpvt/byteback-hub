
-- CONTACTS
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  company text,
  title text,
  source text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);
GRANT SELECT ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view contacts" ON public.contacts FOR SELECT TO authenticated
  USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX IF NOT EXISTS idx_contacts_ws ON public.contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_ws_email ON public.contacts(workspace_id, email);
DROP TRIGGER IF EXISTS trg_contacts_updated ON public.contacts;
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EMAIL THREADS
CREATE TABLE IF NOT EXISTS public.email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  thread_id text NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_email text,
  subject text,
  last_body text,
  mailbox text,
  source text NOT NULL DEFAULT 'instantly',
  category text,
  priority text,
  confidence numeric,
  last_received_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, thread_id)
);
GRANT SELECT ON public.email_threads TO authenticated;
GRANT ALL ON public.email_threads TO service_role;
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view threads" ON public.email_threads FOR SELECT TO authenticated
  USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX IF NOT EXISTS idx_threads_ws ON public.email_threads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_threads_ws_recv ON public.email_threads(workspace_id, last_received_at DESC);
DROP TRIGGER IF EXISTS trg_threads_updated ON public.email_threads;
CREATE TRIGGER trg_threads_updated BEFORE UPDATE ON public.email_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- DEALS
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  thread_id text,
  stage text NOT NULL DEFAULT 'new',
  category text,
  priority text,
  confidence numeric,
  value_estimate numeric,
  source text NOT NULL DEFAULT 'instantly',
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, thread_id)
);
GRANT SELECT ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view deals" ON public.deals FOR SELECT TO authenticated
  USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX IF NOT EXISTS idx_deals_ws ON public.deals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_deals_ws_stage ON public.deals(workspace_id, stage);
DROP TRIGGER IF EXISTS trg_deals_updated ON public.deals;
CREATE TRIGGER trg_deals_updated BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SYNC STATE
CREATE TABLE IF NOT EXISTS public.sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source text NOT NULL,
  cursor text,
  last_run_at timestamptz,
  last_ok_at timestamptz,
  last_error text,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source)
);
GRANT SELECT ON public.sync_state TO authenticated;
GRANT ALL ON public.sync_state TO service_role;
ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view sync_state" ON public.sync_state FOR SELECT TO authenticated
  USING (private.is_workspace_member(auth.uid(), workspace_id));
DROP TRIGGER IF EXISTS trg_sync_state_updated ON public.sync_state;
CREATE TRIGGER trg_sync_state_updated BEFORE UPDATE ON public.sync_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
