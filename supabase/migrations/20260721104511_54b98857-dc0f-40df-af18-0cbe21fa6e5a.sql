
CREATE TABLE public.lead_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_key TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  change_type TEXT NOT NULL CHECK (change_type IN ('stage','manual_status')),
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX lead_audit_log_ws_lead_idx ON public.lead_audit_log (workspace_id, lead_key, created_at DESC);
GRANT SELECT, INSERT ON public.lead_audit_log TO authenticated;
GRANT ALL ON public.lead_audit_log TO service_role;
ALTER TABLE public.lead_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view lead_audit_log" ON public.lead_audit_log
  FOR SELECT TO authenticated
  USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "editors insert lead_audit_log" ON public.lead_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role,'admin'::workspace_role,'member'::workspace_role])
    AND (actor_id IS NULL OR actor_id = auth.uid())
  );
