
-- 1. Enum
DO $$ BEGIN
  CREATE TYPE public.workspace_role AS ENUM ('owner','admin','member','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);

-- 3. Role column on invites
ALTER TABLE public.workspace_invites
  ADD COLUMN IF NOT EXISTS role public.workspace_role NOT NULL DEFAULT 'member';

-- 4. Security-definer helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  );
$$;

CREATE OR REPLACE FUNCTION public.workspace_role_of(_user_id uuid, _workspace_id uuid)
RETURNS public.workspace_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.workspace_members
  WHERE user_id = _user_id AND workspace_id = _workspace_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_user_id uuid, _workspace_id uuid, _roles public.workspace_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND role = ANY(_roles)
  );
$$;

-- 5. Backfill: every existing owner becomes an 'owner' member
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT id, owner_id, 'owner'::public.workspace_role FROM public.workspaces
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 6. Trigger: new workspace -> creator is owner member
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_workspace_add_owner ON public.workspaces;
CREATE TRIGGER trg_workspace_add_owner
AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();

-- 7. updated_at triggers
DROP TRIGGER IF EXISTS trg_workspace_members_updated ON public.workspace_members;
CREATE TRIGGER trg_workspace_members_updated
BEFORE UPDATE ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. Rewrite RLS policies

-- workspaces
DROP POLICY IF EXISTS "own workspaces" ON public.workspaces;
CREATE POLICY "members can view workspace" ON public.workspaces
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), id));
CREATE POLICY "owners can insert workspace" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "admins can update workspace" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(auth.uid(), id, ARRAY['owner','admin']::public.workspace_role[]))
  WITH CHECK (public.has_workspace_role(auth.uid(), id, ARRAY['owner','admin']::public.workspace_role[]));
CREATE POLICY "owner can delete workspace" ON public.workspaces
  FOR DELETE TO authenticated
  USING (public.has_workspace_role(auth.uid(), id, ARRAY['owner']::public.workspace_role[]));

-- tasks
DROP POLICY IF EXISTS "workspace owner tasks" ON public.tasks;
CREATE POLICY "members view tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "editors write tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin','member']::public.workspace_role[]));
CREATE POLICY "editors update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin','member']::public.workspace_role[]))
  WITH CHECK (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin','member']::public.workspace_role[]));
CREATE POLICY "editors delete tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin','member']::public.workspace_role[]));

-- lead_scores
DROP POLICY IF EXISTS "workspace owner lead_scores" ON public.lead_scores;
CREATE POLICY "members view lead_scores" ON public.lead_scores
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "editors write lead_scores" ON public.lead_scores
  FOR ALL TO authenticated
  USING (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin','member']::public.workspace_role[]))
  WITH CHECK (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin','member']::public.workspace_role[]));

-- email_accounts (admin-managed)
DROP POLICY IF EXISTS "workspace owner accounts" ON public.email_accounts;
CREATE POLICY "members view email_accounts" ON public.email_accounts
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "admins manage email_accounts" ON public.email_accounts
  FOR ALL TO authenticated
  USING (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::public.workspace_role[]))
  WITH CHECK (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::public.workspace_role[]));

-- workspace_invites (admin-managed)
DROP POLICY IF EXISTS "workspace owner invites" ON public.workspace_invites;
CREATE POLICY "admins manage invites" ON public.workspace_invites
  FOR ALL TO authenticated
  USING (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::public.workspace_role[]))
  WITH CHECK (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::public.workspace_role[]));

-- workspace_members
CREATE POLICY "members view members" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "admins add members" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::public.workspace_role[]));
CREATE POLICY "admins update members" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::public.workspace_role[]))
  WITH CHECK (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::public.workspace_role[]));
CREATE POLICY "admins remove members" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::public.workspace_role[]));
