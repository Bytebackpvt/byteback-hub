
-- 1. Extend email_threads
ALTER TABLE public.email_threads
  ADD COLUMN IF NOT EXISTS temperature text,
  ADD COLUMN IF NOT EXISTS stage text,
  ADD COLUMN IF NOT EXISTS reply_status text,
  ADD COLUMN IF NOT EXISTS suggested_reply text,
  ADD COLUMN IF NOT EXISTS last_inbound_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_outbound_at timestamptz,
  ADD COLUMN IF NOT EXISTS followup_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS followup_step text,
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_summary jsonb;

CREATE INDEX IF NOT EXISTS email_threads_reply_status_idx
  ON public.email_threads (workspace_id, reply_status, last_inbound_at DESC);
CREATE INDEX IF NOT EXISTS email_threads_stage_idx
  ON public.email_threads (workspace_id, stage);
CREATE INDEX IF NOT EXISTS email_threads_temperature_idx
  ON public.email_threads (workspace_id, temperature);

-- 2. workspace_temperatures
CREATE TABLE IF NOT EXISTS public.workspace_temperatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slug text NOT NULL,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#94a3b8',
  sort_order integer NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_temperatures TO authenticated;
GRANT ALL ON public.workspace_temperatures TO service_role;

ALTER TABLE public.workspace_temperatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view temperatures"
  ON public.workspace_temperatures FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_temperatures.workspace_id
      AND wm.user_id = auth.uid()
  ));

CREATE POLICY "Members can manage temperatures"
  ON public.workspace_temperatures FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_temperatures.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_temperatures.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin')
  ));

CREATE TRIGGER workspace_temperatures_set_updated_at
  BEFORE UPDATE ON public.workspace_temperatures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. workspace_followup_config
CREATE TABLE IF NOT EXISTS public.workspace_followup_config (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ladder_minutes integer[] NOT NULL DEFAULT ARRAY[15,60,240,1440,2880]::integer[],
  channels jsonb NOT NULL DEFAULT '{"push":true,"in_app":true,"email":true,"slack":false}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_followup_config TO authenticated;
GRANT ALL ON public.workspace_followup_config TO service_role;

ALTER TABLE public.workspace_followup_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view followup config"
  ON public.workspace_followup_config FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_followup_config.workspace_id
      AND wm.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage followup config"
  ON public.workspace_followup_config FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_followup_config.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_followup_config.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin')
  ));

CREATE TRIGGER workspace_followup_config_set_updated_at
  BEFORE UPDATE ON public.workspace_followup_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Seed built-in temperatures for every workspace
INSERT INTO public.workspace_temperatures (workspace_id, slug, label, color, sort_order, is_system)
SELECT w.id, t.slug, t.label, t.color, t.sort_order, true
FROM public.workspaces w
CROSS JOIN (VALUES
  ('hot',  'Hot',  '#ef4444', 0),
  ('warm', 'Warm', '#f59e0b', 1),
  ('cold', 'Cold', '#3b82f6', 2),
  ('lost', 'Lost', '#64748b', 3),
  ('spam', 'Spam', '#71717a', 4)
) AS t(slug, label, color, sort_order)
ON CONFLICT (workspace_id, slug) DO NOTHING;

-- 5. Seed default followup config for every workspace
INSERT INTO public.workspace_followup_config (workspace_id)
SELECT id FROM public.workspaces
ON CONFLICT (workspace_id) DO NOTHING;
