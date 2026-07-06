
CREATE TYPE public.notification_kind AS ENUM ('hot_lead','new_reply','lost_lead','followup','info');

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.notification_kind NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  thread_key text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX notifications_workspace_thread_kind_uidx
  ON public.notifications (workspace_id, kind, thread_key)
  WHERE thread_key IS NOT NULL;

CREATE INDEX notifications_workspace_created_idx
  ON public.notifications (workspace_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view workspace notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(auth.uid(), workspace_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "members create workspace notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "members update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(auth.uid(), workspace_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  )
  WITH CHECK (
    public.is_workspace_member(auth.uid(), workspace_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "admins delete workspace notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::public.workspace_role[]));
