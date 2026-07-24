
CREATE UNIQUE INDEX IF NOT EXISTS oauth_connections_email_provider_unique
  ON public.oauth_connections (lower(account_email), provider)
  WHERE status IS DISTINCT FROM 'revoked';

CREATE UNIQUE INDEX IF NOT EXISTS email_accounts_email_provider_unique
  ON public.email_accounts (lower(email), provider);

CREATE OR REPLACE FUNCTION public.find_email_owner_workspace(_email text, _provider text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ws FROM (
    SELECT workspace_id AS ws, 1 AS ord FROM public.oauth_connections
      WHERE lower(account_email) = lower(_email)
        AND provider = _provider
        AND status IS DISTINCT FROM 'revoked'
    UNION ALL
    SELECT workspace_id AS ws, 2 AS ord FROM public.email_accounts
      WHERE lower(email) = lower(_email)
        AND provider = _provider
  ) t
  ORDER BY ord
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_email_owner_workspace(text, text) TO authenticated;
