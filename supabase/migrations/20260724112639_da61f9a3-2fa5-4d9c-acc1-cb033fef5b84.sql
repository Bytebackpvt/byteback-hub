
ALTER TABLE public.workspace_subscriptions
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'payu',
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT,
  ADD COLUMN IF NOT EXISTS payu_txn_id TEXT,
  ADD COLUMN IF NOT EXISTS payu_mihpayid TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_subscriptions_payu_txn_id_key
  ON public.workspace_subscriptions (payu_txn_id)
  WHERE payu_txn_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.payu_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  txnid TEXT NOT NULL UNIQUE,
  mihpayid TEXT,
  plan_key TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL,
  mode TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payu_payments TO authenticated;
GRANT ALL ON public.payu_payments TO service_role;

ALTER TABLE public.payu_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own workspace payments"
  ON public.payu_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = payu_payments.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS payu_payments_workspace_created_idx
  ON public.payu_payments (workspace_id, created_at DESC);

CREATE TRIGGER trg_payu_payments_updated
  BEFORE UPDATE ON public.payu_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
