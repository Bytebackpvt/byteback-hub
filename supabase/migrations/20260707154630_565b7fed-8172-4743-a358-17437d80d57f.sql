CREATE TABLE public.user_ui_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ui_prefs TO authenticated;
GRANT ALL ON public.user_ui_prefs TO service_role;

ALTER TABLE public.user_ui_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_ui_prefs_select_own" ON public.user_ui_prefs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_ui_prefs_insert_own" ON public.user_ui_prefs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_ui_prefs_update_own" ON public.user_ui_prefs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_ui_prefs_delete_own" ON public.user_ui_prefs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);