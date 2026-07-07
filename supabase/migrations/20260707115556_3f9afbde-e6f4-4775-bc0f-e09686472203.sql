GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_role(uuid, uuid, public.workspace_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_workspace_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_role_of(uuid, uuid) TO authenticated;