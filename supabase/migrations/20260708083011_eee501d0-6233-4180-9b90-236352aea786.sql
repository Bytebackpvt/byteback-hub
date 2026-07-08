-- Fix 1: Restrict SELECT on workspace_integrations to admins so member/viewer roles cannot read webhook URLs/API keys.
-- Fix 2: Move all SECURITY DEFINER helpers out of the public (PostgREST-exposed) schema into a private schema.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role, postgres;

-- Drop all policies that reference the SECURITY DEFINER helpers before moving them.
DROP POLICY "members can view workspace" ON public.workspaces;
DROP POLICY "admins can update workspace" ON public.workspaces;
DROP POLICY "owner can delete workspace" ON public.workspaces;
DROP POLICY "members view tasks" ON public.tasks;
DROP POLICY "editors write tasks" ON public.tasks;
DROP POLICY "editors update tasks" ON public.tasks;
DROP POLICY "editors delete tasks" ON public.tasks;
DROP POLICY "members view lead_scores" ON public.lead_scores;
DROP POLICY "editors write lead_scores" ON public.lead_scores;
DROP POLICY "members view email_accounts" ON public.email_accounts;
DROP POLICY "admins manage email_accounts" ON public.email_accounts;
DROP POLICY "admins manage invites" ON public.workspace_invites;
DROP POLICY "members view members" ON public.workspace_members;
DROP POLICY "admins add members" ON public.workspace_members;
DROP POLICY "admins update members" ON public.workspace_members;
DROP POLICY "admins remove members" ON public.workspace_members;
DROP POLICY "members view workspace notifications" ON public.notifications;
DROP POLICY "members create workspace notifications" ON public.notifications;
DROP POLICY "members update own notifications" ON public.notifications;
DROP POLICY "admins delete workspace notifications" ON public.notifications;
DROP POLICY "members read ai_events" ON public.ai_events;
DROP POLICY "members insert ai_events" ON public.ai_events;
DROP POLICY "members update ai_events" ON public.ai_events;
DROP POLICY "members delete ai_events" ON public.ai_events;
DROP POLICY "members read ai_feedback" ON public.ai_feedback;
DROP POLICY "members insert own ai_feedback" ON public.ai_feedback;
DROP POLICY "Workspace members can view stages" ON public.pipeline_stages;
DROP POLICY "Workspace owners/admins manage stages" ON public.pipeline_stages;
DROP POLICY "members can view workspace integrations" ON public.workspace_integrations;
DROP POLICY "admins can insert workspace integrations" ON public.workspace_integrations;
DROP POLICY "admins can update workspace integrations" ON public.workspace_integrations;
DROP POLICY "admins can delete workspace integrations" ON public.workspace_integrations;

-- Move the helpers out of the public API schema (triggers reference by OID, so they keep working).
ALTER FUNCTION public.is_workspace_member(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.has_workspace_role(uuid, uuid, workspace_role[]) SET SCHEMA private;
ALTER FUNCTION public.workspace_role_of(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.my_workspace_role(uuid) SET SCHEMA private;
ALTER FUNCTION public.handle_new_user() SET SCHEMA private;
ALTER FUNCTION public.add_owner_as_member() SET SCHEMA private;
ALTER FUNCTION public.escalate_overdue_tasks() SET SCHEMA private;

-- Lock down execute privileges: only what actually needs to call each helper.
REVOKE ALL ON FUNCTION private.is_workspace_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_workspace_role(uuid, uuid, workspace_role[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.workspace_role_of(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.my_workspace_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.add_owner_as_member() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.escalate_overdue_tasks() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.is_workspace_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_workspace_role(uuid, uuid, workspace_role[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.workspace_role_of(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.my_workspace_role(uuid) TO authenticated, service_role;
-- Trigger/cron-only functions: only the service role needs direct execute.
GRANT EXECUTE ON FUNCTION private.escalate_overdue_tasks() TO service_role;

-- Recreate every RLS policy against the private-schema helpers.
CREATE POLICY "members can view workspace" ON public.workspaces FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), id));
CREATE POLICY "admins can update workspace" ON public.workspaces FOR UPDATE TO authenticated USING (private.has_workspace_role(auth.uid(), id, ARRAY['owner'::workspace_role, 'admin'::workspace_role])) WITH CHECK (private.has_workspace_role(auth.uid(), id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "owner can delete workspace" ON public.workspaces FOR DELETE TO authenticated USING (private.has_workspace_role(auth.uid(), id, ARRAY['owner'::workspace_role]));
CREATE POLICY "members view tasks" ON public.tasks FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "editors write tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role, 'member'::workspace_role]));
CREATE POLICY "editors update tasks" ON public.tasks FOR UPDATE TO authenticated USING (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role, 'member'::workspace_role])) WITH CHECK (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role, 'member'::workspace_role]));
CREATE POLICY "editors delete tasks" ON public.tasks FOR DELETE TO authenticated USING (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role, 'member'::workspace_role]));
CREATE POLICY "members view lead_scores" ON public.lead_scores FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "editors write lead_scores" ON public.lead_scores FOR ALL TO authenticated USING (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role, 'member'::workspace_role])) WITH CHECK (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role, 'member'::workspace_role]));
CREATE POLICY "members view email_accounts" ON public.email_accounts FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "admins manage email_accounts" ON public.email_accounts FOR ALL TO authenticated USING (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role])) WITH CHECK (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "admins manage invites" ON public.workspace_invites FOR ALL TO authenticated USING (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role])) WITH CHECK (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "members view members" ON public.workspace_members FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "admins add members" ON public.workspace_members FOR INSERT TO authenticated WITH CHECK (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "admins update members" ON public.workspace_members FOR UPDATE TO authenticated USING (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role])) WITH CHECK (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "admins remove members" ON public.workspace_members FOR DELETE TO authenticated USING (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "members view workspace notifications" ON public.notifications FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id) AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "members create workspace notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id) AND (user_id IS NULL OR user_id = auth.uid())) WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id) AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "admins delete workspace notifications" ON public.notifications FOR DELETE TO authenticated USING (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "members read ai_events" ON public.ai_events FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members insert ai_events" ON public.ai_events FOR INSERT TO authenticated WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members update ai_events" ON public.ai_events FOR UPDATE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members delete ai_events" ON public.ai_events FOR DELETE TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members read ai_feedback" ON public.ai_feedback FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members insert own ai_feedback" ON public.ai_feedback FOR INSERT TO authenticated WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id) AND user_id = auth.uid());
CREATE POLICY "Workspace members can view stages" ON public.pipeline_stages FOR SELECT TO authenticated USING (private.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace owners/admins manage stages" ON public.pipeline_stages FOR ALL TO authenticated USING (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role])) WITH CHECK (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "admins can view workspace integrations" ON public.workspace_integrations FOR SELECT TO authenticated USING (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "admins can insert workspace integrations" ON public.workspace_integrations FOR INSERT TO authenticated WITH CHECK (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "admins can update workspace integrations" ON public.workspace_integrations FOR UPDATE TO authenticated USING (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role])) WITH CHECK (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "admins can delete workspace integrations" ON public.workspace_integrations FOR DELETE TO authenticated USING (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));