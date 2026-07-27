
-- Add Abhishek as admin of byteback workspace
INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES ('40891d70-62ed-49f7-b973-23319e329967', 'ea24b8fc-d904-4574-875b-27f03931594b', 'admin')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Mark both invites accepted
UPDATE public.workspace_invites
SET accepted_at = now()
WHERE email IN ('abhishek@byteback.co.in','chitra@byteback.co.in')
  AND workspace_id = '40891d70-62ed-49f7-b973-23319e329967'
  AND accepted_at IS NULL;
