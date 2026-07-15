CREATE OR REPLACE FUNCTION public.prevent_last_owner_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_owners INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'owner' THEN
      SELECT COUNT(*) INTO remaining_owners
      FROM public.workspace_members
      WHERE workspace_id = OLD.workspace_id AND role = 'owner' AND id <> OLD.id;
      IF remaining_owners = 0 THEN
        RAISE EXCEPTION 'Cannot remove the last owner of a workspace';
      END IF;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'owner' AND NEW.role <> 'owner' THEN
      SELECT COUNT(*) INTO remaining_owners
      FROM public.workspace_members
      WHERE workspace_id = OLD.workspace_id AND role = 'owner' AND id <> OLD.id;
      IF remaining_owners = 0 THEN
        RAISE EXCEPTION 'Cannot demote the last owner of a workspace';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_owner_removal ON public.workspace_members;
CREATE TRIGGER trg_prevent_last_owner_removal
BEFORE DELETE OR UPDATE ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_owner_removal();