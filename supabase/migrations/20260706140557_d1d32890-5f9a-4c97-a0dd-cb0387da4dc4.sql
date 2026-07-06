
REVOKE ALL ON FUNCTION public.escalate_overdue_tasks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_overdue_tasks() TO postgres, service_role;
