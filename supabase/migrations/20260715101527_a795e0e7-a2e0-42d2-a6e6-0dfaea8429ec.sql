-- Lock down workspace_invites: revoke anon read access. Token lookups go
-- through the server-only supabaseAdmin client (getInviteByToken), which
-- bypasses RLS, so anon no longer needs direct SELECT on the table.
DROP POLICY IF EXISTS "invites readable by token" ON public.workspace_invites;
REVOKE SELECT ON public.workspace_invites FROM anon;