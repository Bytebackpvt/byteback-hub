
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- Recreate function with search_path that also includes extensions so vector/halfvec types resolve
CREATE OR REPLACE FUNCTION public.match_email_embeddings(
  _workspace_id UUID,
  _query extensions.vector(3072),
  _limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  thread_id TEXT,
  subject TEXT,
  contact_name TEXT,
  company TEXT,
  contact_email TEXT,
  content TEXT,
  category TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT
    e.id,
    e.thread_id,
    e.subject,
    e.contact_name,
    e.company,
    e.contact_email,
    e.content,
    e.category,
    1 - (e.embedding::extensions.halfvec(3072) <=> _query::extensions.halfvec(3072)) AS similarity,
    e.created_at
  FROM public.email_embeddings e
  WHERE e.workspace_id = _workspace_id
    AND private.is_workspace_member(auth.uid(), e.workspace_id)
  ORDER BY e.embedding::extensions.halfvec(3072) <=> _query::extensions.halfvec(3072)
  LIMIT GREATEST(1, LEAST(_limit, 25));
$$;

GRANT EXECUTE ON FUNCTION public.match_email_embeddings(UUID, extensions.vector, INT) TO authenticated;
