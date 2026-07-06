
CREATE TABLE IF NOT EXISTS public.workspace_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected',
  label TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  secret TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_integrations TO authenticated;
GRANT ALL ON public.workspace_integrations TO service_role;

ALTER TABLE public.workspace_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view workspace integrations"
  ON public.workspace_integrations FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "admins can insert workspace integrations"
  ON public.workspace_integrations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::workspace_role[]));

CREATE POLICY "admins can update workspace integrations"
  ON public.workspace_integrations FOR UPDATE
  TO authenticated
  USING (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::workspace_role[]))
  WITH CHECK (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::workspace_role[]));

CREATE POLICY "admins can delete workspace integrations"
  ON public.workspace_integrations FOR DELETE
  TO authenticated
  USING (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::workspace_role[]));

CREATE TRIGGER trg_workspace_integrations_updated_at
  BEFORE UPDATE ON public.workspace_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_workspace_integrations_ws ON public.workspace_integrations(workspace_id);
