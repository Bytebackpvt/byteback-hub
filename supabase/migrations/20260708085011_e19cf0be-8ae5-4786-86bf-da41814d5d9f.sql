
-- 1) Explicit, scoped SELECT policies on workspace_invites (defense-in-depth).
--    The existing FOR ALL admin policy already covers admin reads, but making
--    SELECT explicit prevents accidental future widening from leaking invite
--    emails, and lets an invited user see only their own pending invite.

DROP POLICY IF EXISTS "admins view invites" ON public.workspace_invites;
CREATE POLICY "admins view invites"
  ON public.workspace_invites
  FOR SELECT
  TO authenticated
  USING (
    private.has_workspace_role(
      auth.uid(),
      workspace_id,
      ARRAY['owner'::workspace_role, 'admin'::workspace_role]
    )
  );

DROP POLICY IF EXISTS "invited user views own invite" ON public.workspace_invites;
CREATE POLICY "invited user views own invite"
  ON public.workspace_invites
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND email IS NOT NULL
    AND lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );

-- 2) Harden helper functions: strict null checks so a missing auth.uid()
--    or missing workspace scope cannot accidentally match rows.

CREATE OR REPLACE FUNCTION private.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    _user_id IS NOT NULL
    AND _workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE user_id = _user_id
        AND workspace_id = _workspace_id
    );
$function$;

CREATE OR REPLACE FUNCTION private.has_workspace_role(
  _user_id uuid,
  _workspace_id uuid,
  _roles workspace_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    _user_id IS NOT NULL
    AND _workspace_id IS NOT NULL
    AND _roles IS NOT NULL
    AND array_length(_roles, 1) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE user_id = _user_id
        AND workspace_id = _workspace_id
        AND role = ANY(_roles)
    );
$function$;
