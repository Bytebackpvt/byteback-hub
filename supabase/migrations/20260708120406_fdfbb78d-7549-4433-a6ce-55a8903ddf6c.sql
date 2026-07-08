
CREATE TABLE public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  query text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  alert_enabled boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz,
  last_seen_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX saved_searches_workspace_idx ON public.saved_searches(workspace_id);
CREATE INDEX saved_searches_alert_idx ON public.saved_searches(alert_enabled) WHERE alert_enabled = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;
GRANT ALL ON public.saved_searches TO service_role;

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view workspace saved searches"
  ON public.saved_searches FOR SELECT TO authenticated
  USING (private.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "users create own saved searches"
  ON public.saved_searches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND private.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "users update own saved searches"
  ON public.saved_searches FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own saved searches"
  ON public.saved_searches FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER saved_searches_set_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
