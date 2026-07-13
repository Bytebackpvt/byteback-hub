
ALTER TABLE public.workspace_invites 
  ADD COLUMN IF NOT EXISTS token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_invites_token_key ON public.workspace_invites(token);

-- Allow anon to look up an invite by its token (for the accept page preview before sign-in).
GRANT SELECT ON public.workspace_invites TO anon;

DROP POLICY IF EXISTS "invites readable by token" ON public.workspace_invites;
CREATE POLICY "invites readable by token"
  ON public.workspace_invites
  FOR SELECT
  TO anon, authenticated
  USING (true);
