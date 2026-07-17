ALTER TABLE public.lead_scores
  ADD COLUMN IF NOT EXISTS manual_status text,
  ADD COLUMN IF NOT EXISTS stage text;

ALTER TABLE public.lead_scores
  DROP CONSTRAINT IF EXISTS lead_scores_manual_status_check;
ALTER TABLE public.lead_scores
  ADD CONSTRAINT lead_scores_manual_status_check
  CHECK (manual_status IS NULL OR manual_status IN ('hot','warm','cold','not-interested'));

ALTER TABLE public.lead_scores
  DROP CONSTRAINT IF EXISTS lead_scores_stage_check;
ALTER TABLE public.lead_scores
  ADD CONSTRAINT lead_scores_stage_check
  CHECK (stage IS NULL OR stage IN ('open','contacted','meeting','won','lost','churned'));