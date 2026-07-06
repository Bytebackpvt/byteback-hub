
-- AI Timeline: every interpretable event on a lead/thread
CREATE TABLE public.ai_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  thread_id TEXT,
  lead_email TEXT,
  event_type TEXT NOT NULL, -- classified | assigned | reminder_created | escalated | reply_sent | note | feedback | status_change | scored
  title TEXT NOT NULL,
  detail TEXT,
  category TEXT,
  confidence NUMERIC,
  next_action TEXT,
  reason TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_events_workspace_thread_idx ON public.ai_events(workspace_id, thread_id, created_at DESC);
CREATE INDEX ai_events_workspace_created_idx ON public.ai_events(workspace_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_events TO authenticated;
GRANT ALL ON public.ai_events TO service_role;
ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read ai_events"
  ON public.ai_events FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "members insert ai_events"
  ON public.ai_events FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "members update ai_events"
  ON public.ai_events FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "members delete ai_events"
  ON public.ai_events FOR DELETE
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- AI Feedback: accept/reject signal on any AI suggestion
CREATE TABLE public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT,
  suggestion_type TEXT NOT NULL, -- classification | next_action | reply | score
  suggestion_value TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('accepted','rejected')),
  correction TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_feedback_workspace_idx ON public.ai_feedback(workspace_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_feedback TO authenticated;
GRANT ALL ON public.ai_feedback TO service_role;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read ai_feedback"
  ON public.ai_feedback FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "members insert own ai_feedback"
  ON public.ai_feedback FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND user_id = auth.uid());

CREATE POLICY "members delete own ai_feedback"
  ON public.ai_feedback FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
