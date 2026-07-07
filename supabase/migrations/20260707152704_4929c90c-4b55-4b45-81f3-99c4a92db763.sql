
ALTER TABLE public.pipeline_stages
  ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'circle',
  ADD COLUMN IF NOT EXISTS automation jsonb NOT NULL DEFAULT '{}'::jsonb;
