REVOKE EXECUTE ON FUNCTION public.workspace_role_of(uuid, uuid) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_workspace_role(uuid) FROM authenticated, anon, PUBLIC;