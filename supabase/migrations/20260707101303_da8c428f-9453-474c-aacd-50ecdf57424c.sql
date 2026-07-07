DROP POLICY IF EXISTS "owners can view own workspace" ON public.workspaces;
CREATE POLICY "owners can view own workspace"
ON public.workspaces
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "owners can update own workspace" ON public.workspaces;
CREATE POLICY "owners can update own workspace"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "owners can delete own workspace" ON public.workspaces;
CREATE POLICY "owners can delete own workspace"
ON public.workspaces
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);