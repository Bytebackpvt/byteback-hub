
-- Revoke public/anon/authenticated EXECUTE on SECURITY DEFINER functions
-- so they cannot be called through the Data API. Trigger functions and
-- internal queue/dispatch helpers should only run via triggers, cron, or
-- service_role.

REVOKE ALL ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_lead_for_thread() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_workspace_subscription() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_threads_update_reply_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_last_owner_removal() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.find_email_owner_workspace(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- match_email_embeddings is intentionally callable by signed-in users; it
-- enforces workspace membership internally via private.is_workspace_member.
REVOKE ALL ON FUNCTION public.match_email_embeddings(uuid, extensions.vector, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_email_embeddings(uuid, extensions.vector, integer) TO authenticated;
