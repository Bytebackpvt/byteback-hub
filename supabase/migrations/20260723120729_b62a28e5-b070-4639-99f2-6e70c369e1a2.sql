
-- 1. Leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_domain TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  temperature TEXT,
  stage TEXT,
  owner_mailbox TEXT,
  first_contact_at TIMESTAMPTZ,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_followup_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  thread_count INT NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, customer_email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view leads" ON public.leads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = leads.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "Workspace members can insert leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = leads.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "Workspace members can update leads" ON public.leads FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = leads.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "Workspace members can delete leads" ON public.leads FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = leads.workspace_id AND wm.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_leads_ws_status ON public.leads(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_ws_next_followup ON public.leads(workspace_id, next_followup_at) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_leads_ws_last_activity ON public.leads(workspace_id, last_activity_at);

CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Link email_threads to leads
ALTER TABLE public.email_threads
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_email_norm TEXT;

CREATE INDEX IF NOT EXISTS idx_email_threads_lead ON public.email_threads(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_ws_customer ON public.email_threads(workspace_id, customer_email_norm);

-- 3. Follow-up config: auto-close (15 days default)
ALTER TABLE public.workspace_followup_config
  ADD COLUMN IF NOT EXISTS auto_close_days INT NOT NULL DEFAULT 15;

-- 4. Notification prefs: email digest
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS email_digest_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_digest_frequency TEXT NOT NULL DEFAULT 'daily';

-- 5. Trigger: upsert lead from thread
CREATE OR REPLACE FUNCTION public.upsert_lead_for_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_domain TEXT;
  v_lead_id UUID;
  v_direction TEXT;
  v_activity TIMESTAMPTZ;
BEGIN
  v_email := LOWER(TRIM(COALESCE(NEW.contact_email, NEW.meta->>'customer_email', '')));
  IF v_email = '' OR v_email IS NULL THEN
    RETURN NEW;
  END IF;

  v_domain := split_part(v_email, '@', 2);
  v_direction := COALESCE(NEW.meta->>'direction', 'in');
  v_activity := COALESCE(NEW.last_received_at, NEW.updated_at, now());

  INSERT INTO public.leads (
    workspace_id, customer_email, customer_domain,
    first_contact_at, last_activity_at,
    last_inbound_at, last_outbound_at,
    owner_mailbox, temperature, stage, thread_count
  )
  VALUES (
    NEW.workspace_id, v_email, v_domain,
    v_activity, v_activity,
    CASE WHEN v_direction = 'in' THEN v_activity END,
    CASE WHEN v_direction = 'out' THEN v_activity END,
    NEW.mailbox, NEW.temperature, NEW.stage, 1
  )
  ON CONFLICT (workspace_id, customer_email) DO UPDATE SET
    last_activity_at = GREATEST(leads.last_activity_at, v_activity),
    last_inbound_at = CASE WHEN v_direction = 'in'
      THEN GREATEST(COALESCE(leads.last_inbound_at, v_activity), v_activity)
      ELSE leads.last_inbound_at END,
    last_outbound_at = CASE WHEN v_direction = 'out'
      THEN GREATEST(COALESCE(leads.last_outbound_at, v_activity), v_activity)
      ELSE leads.last_outbound_at END,
    owner_mailbox = COALESCE(NEW.mailbox, leads.owner_mailbox),
    status = CASE
      WHEN leads.status IN ('won','lost') THEN leads.status
      WHEN v_direction = 'in' THEN 'open'
      ELSE leads.status END,
    updated_at = now()
  RETURNING id INTO v_lead_id;

  NEW.lead_id := v_lead_id;
  NEW.customer_email_norm := v_email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_threads_upsert_lead ON public.email_threads;
CREATE TRIGGER trg_email_threads_upsert_lead
  BEFORE INSERT OR UPDATE OF contact_email, last_received_at, meta, mailbox, temperature, stage
  ON public.email_threads
  FOR EACH ROW EXECUTE FUNCTION public.upsert_lead_for_thread();

-- 6. Backfill
UPDATE public.email_threads
SET customer_email_norm = LOWER(TRIM(contact_email))
WHERE contact_email IS NOT NULL AND customer_email_norm IS NULL;

INSERT INTO public.leads (workspace_id, customer_email, customer_domain,
  first_contact_at, last_activity_at, last_inbound_at, last_outbound_at,
  owner_mailbox, temperature, stage, thread_count)
SELECT
  t.workspace_id,
  t.customer_email_norm,
  split_part(t.customer_email_norm, '@', 2),
  MIN(COALESCE(t.last_received_at, t.created_at)),
  MAX(COALESCE(t.last_received_at, t.updated_at)),
  MAX(t.last_inbound_at),
  MAX(t.last_outbound_at),
  MAX(t.mailbox),
  MAX(t.temperature),
  MAX(t.stage),
  COUNT(*)
FROM public.email_threads t
WHERE t.customer_email_norm IS NOT NULL AND t.customer_email_norm <> ''
GROUP BY t.workspace_id, t.customer_email_norm
ON CONFLICT (workspace_id, customer_email) DO NOTHING;

UPDATE public.email_threads t
SET lead_id = l.id
FROM public.leads l
WHERE t.workspace_id = l.workspace_id
  AND t.customer_email_norm = l.customer_email
  AND t.lead_id IS NULL;

UPDATE public.leads l
SET thread_count = sub.c
FROM (SELECT lead_id, COUNT(*) c FROM public.email_threads WHERE lead_id IS NOT NULL GROUP BY lead_id) sub
WHERE l.id = sub.lead_id;

-- Backfill customer_name from contacts if available
UPDATE public.leads l
SET customer_name = c.name
FROM public.contacts c
WHERE c.workspace_id = l.workspace_id
  AND LOWER(TRIM(c.email)) = l.customer_email
  AND l.customer_name IS NULL
  AND c.name IS NOT NULL;
