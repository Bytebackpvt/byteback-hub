
-- Trigger that maintains last_inbound_at / last_outbound_at / reply_status on
-- email_threads based on incoming rows. Direction is read from meta->>'direction'
-- ('in' | 'out'); if absent, we treat gmail SENT source hint or default to 'in'.

CREATE OR REPLACE FUNCTION public.email_threads_update_reply_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  direction text;
  received timestamptz;
  new_stage text;
  new_reply_status text;
BEGIN
  direction := COALESCE(NEW.meta->>'direction', 'in');
  received := COALESCE(NEW.last_received_at, now());

  IF direction = 'out' THEN
    NEW.last_outbound_at := GREATEST(COALESCE(NEW.last_outbound_at, received), received);
  ELSE
    NEW.last_inbound_at := GREATEST(COALESCE(NEW.last_inbound_at, received), received);
  END IF;

  -- Preserve manually set closed/won/lost stages.
  new_stage := COALESCE(NEW.stage, NULL);

  IF new_stage IN ('won','lost','closed') THEN
    new_reply_status := 'closed';
  ELSIF NEW.last_inbound_at IS NULL AND NEW.last_outbound_at IS NOT NULL THEN
    new_reply_status := 'awaiting_customer';
  ELSIF NEW.last_outbound_at IS NULL AND NEW.last_inbound_at IS NOT NULL THEN
    new_reply_status := 'waiting_reply';
  ELSIF NEW.last_inbound_at > COALESCE(NEW.last_outbound_at, 'epoch'::timestamptz) THEN
    -- Customer message is newer than our last reply.
    IF NEW.last_outbound_at IS NOT NULL THEN
      new_reply_status := 'customer_replied_again';
    ELSE
      new_reply_status := 'waiting_reply';
    END IF;
  ELSE
    new_reply_status := 'replied';
  END IF;

  NEW.reply_status := new_reply_status;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_threads_reply_status ON public.email_threads;
CREATE TRIGGER trg_email_threads_reply_status
  BEFORE INSERT OR UPDATE ON public.email_threads
  FOR EACH ROW EXECUTE FUNCTION public.email_threads_update_reply_status();

-- One-off backfill for existing rows: infer from meta.direction and last_received_at.
UPDATE public.email_threads t
SET
  last_inbound_at = CASE
    WHEN COALESCE(meta->>'direction','in') = 'in' THEN COALESCE(last_inbound_at, last_received_at)
    ELSE last_inbound_at
  END,
  last_outbound_at = CASE
    WHEN meta->>'direction' = 'out' THEN COALESCE(last_outbound_at, last_received_at)
    ELSE last_outbound_at
  END;

-- Now recompute reply_status for all rows by re-writing the same values so the
-- BEFORE UPDATE trigger fires.
UPDATE public.email_threads SET updated_at = updated_at;
