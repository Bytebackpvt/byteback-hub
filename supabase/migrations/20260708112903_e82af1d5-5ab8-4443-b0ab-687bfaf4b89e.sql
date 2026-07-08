
-- Consolidate workspaces policies: drop redundant owner_id-based duplicates
DROP POLICY IF EXISTS "owners can view own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "owners can update own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "owners can delete own workspace" ON public.workspaces;

-- Restrict integration catalog reads to authenticated users only
DROP POLICY IF EXISTS "catalog readable by anyone" ON public.integration_catalog;
REVOKE SELECT ON public.integration_catalog FROM anon;
CREATE POLICY "catalog readable by authenticated"
  ON public.integration_catalog FOR SELECT
  TO authenticated
  USING (true);
