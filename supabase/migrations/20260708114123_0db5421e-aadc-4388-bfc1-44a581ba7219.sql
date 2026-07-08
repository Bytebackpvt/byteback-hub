
-- Milestone 3: AI memory (pgvector) + radar cache

CREATE EXTENSION IF NOT EXISTS vector;

-- Email embeddings for AI memory / semantic search
CREATE TABLE IF NOT EXISTS public.email_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_email TEXT,
  contact_name TEXT,
  company TEXT,
  thread_id TEXT,
  subject TEXT,
  content TEXT NOT NULL,
  category TEXT,
  embedding vector(3072) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, thread_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_embeddings TO authenticated;
GRANT ALL ON public.email_embeddings TO service_role;

ALTER TABLE public.email_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read embeddings"
  ON public.email_embeddings FOR SELECT TO authenticated
  USING (private.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "workspace members insert embeddings"
  ON public.email_embeddings FOR INSERT TO authenticated
  WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "workspace admins delete embeddings"
  ON public.email_embeddings FOR DELETE TO authenticated
  USING (private.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role,'admin'::workspace_role]));

CREATE INDEX IF NOT EXISTS email_embeddings_workspace_idx
  ON public.email_embeddings (workspace_id, created_at DESC);

-- HNSW index via halfvec cast (pgvector's 2000-dim cap applies to raw vector type)
CREATE INDEX IF NOT EXISTS email_embeddings_vec_idx
  ON public.email_embeddings USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

-- Semantic search function (workspace-scoped via RLS on the underlying table)
CREATE OR REPLACE FUNCTION public.match_email_embeddings(
  _workspace_id UUID,
  _query vector(3072),
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
SET search_path = public
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
    1 - (e.embedding::halfvec(3072) <=> _query::halfvec(3072)) AS similarity,
    e.created_at
  FROM public.email_embeddings e
  WHERE e.workspace_id = _workspace_id
    AND private.is_workspace_member(auth.uid(), e.workspace_id)
  ORDER BY e.embedding::halfvec(3072) <=> _query::halfvec(3072)
  LIMIT GREATEST(1, LEAST(_limit, 25));
$$;

GRANT EXECUTE ON FUNCTION public.match_email_embeddings(UUID, vector, INT) TO authenticated;

-- Opportunity Radar snapshot cache
CREATE TABLE IF NOT EXISTS public.ai_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, kind)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_insights_cache TO authenticated;
GRANT ALL ON public.ai_insights_cache TO service_role;

ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read insights"
  ON public.ai_insights_cache FOR SELECT TO authenticated
  USING (private.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "workspace members write insights"
  ON public.ai_insights_cache FOR INSERT TO authenticated
  WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "workspace members update insights"
  ON public.ai_insights_cache FOR UPDATE TO authenticated
  USING (private.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (private.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER ai_insights_cache_set_updated_at
  BEFORE UPDATE ON public.ai_insights_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
