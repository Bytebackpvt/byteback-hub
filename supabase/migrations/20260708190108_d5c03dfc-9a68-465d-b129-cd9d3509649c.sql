-- Add per-workspace inbound forwarding token so any email provider can POST to our webhook
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS inbound_token text UNIQUE;

-- Backfill tokens for existing workspaces
UPDATE public.workspaces
   SET inbound_token = encode(gen_random_bytes(16), 'hex')
 WHERE inbound_token IS NULL;

-- Auto-generate token on insert going forward
CREATE OR REPLACE FUNCTION public.set_inbound_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.inbound_token IS NULL THEN
    NEW.inbound_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspaces_set_inbound_token ON public.workspaces;
CREATE TRIGGER workspaces_set_inbound_token
  BEFORE INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_inbound_token();
