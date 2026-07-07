CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.oauth_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  account_email text,
  account_label text,
  access_token_enc bytea,
  refresh_token_enc bytea,
  expires_at timestamptz,
  scopes text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id, provider, account_email)
);

CREATE INDEX oauth_connections_user_provider_idx
  ON public.oauth_connections(user_id, provider);
CREATE INDEX oauth_connections_workspace_idx
  ON public.oauth_connections(workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_connections TO authenticated;
GRANT ALL ON public.oauth_connections TO service_role;

ALTER TABLE public.oauth_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own connections readable"
  ON public.oauth_connections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "own connections insertable"
  ON public.oauth_connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own connections updatable"
  ON public.oauth_connections FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own connections deletable"
  ON public.oauth_connections FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER oauth_connections_updated_at
  BEFORE UPDATE ON public.oauth_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();