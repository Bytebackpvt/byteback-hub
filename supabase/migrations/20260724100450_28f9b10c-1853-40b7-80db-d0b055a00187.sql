
CREATE TABLE IF NOT EXISTS public.workspace_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan_key TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  price_id TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.workspace_subscriptions TO authenticated;
GRANT ALL ON public.workspace_subscriptions TO service_role;
ALTER TABLE public.workspace_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their workspace subscription"
  ON public.workspace_subscriptions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_subscriptions.workspace_id
      AND wm.user_id = auth.uid()
  ));

CREATE TRIGGER trg_ws_sub_updated BEFORE UPDATE ON public.workspace_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed free rows for every existing workspace
INSERT INTO public.workspace_subscriptions (workspace_id, plan_key)
SELECT id, 'free' FROM public.workspaces
ON CONFLICT (workspace_id) DO NOTHING;

-- Mark anjali@byteback.co.in's workspace(s) as internal_unlimited (forever free)
UPDATE public.workspace_subscriptions ws
SET plan_key = 'internal_unlimited', status = 'active'
WHERE ws.workspace_id IN (
  SELECT DISTINCT wm.workspace_id
  FROM public.workspace_members wm
  JOIN auth.users u ON u.id = wm.user_id
  WHERE lower(u.email) = 'anjali@byteback.co.in'
);

-- Auto-provision a free row when a new workspace is created
CREATE OR REPLACE FUNCTION public.seed_workspace_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.workspace_subscriptions (workspace_id, plan_key)
  VALUES (NEW.id, 'free')
  ON CONFLICT (workspace_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_ws_sub ON public.workspaces;
CREATE TRIGGER trg_seed_ws_sub AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.seed_workspace_subscription();
