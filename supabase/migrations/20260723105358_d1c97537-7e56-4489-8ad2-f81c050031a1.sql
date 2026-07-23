
REVOKE ALL ON FUNCTION public.email_threads_update_reply_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.email_threads_update_reply_status() FROM anon;
REVOKE ALL ON FUNCTION public.email_threads_update_reply_status() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.email_threads_update_reply_status() TO service_role;
