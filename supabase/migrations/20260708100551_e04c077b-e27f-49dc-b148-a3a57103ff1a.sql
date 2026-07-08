DROP INDEX IF EXISTS public.notifications_workspace_kind_thread_key_uidx;
DELETE FROM public.notifications a USING public.notifications b
WHERE a.ctid < b.ctid
  AND a.workspace_id = b.workspace_id
  AND a.kind = b.kind
  AND a.thread_key IS NOT DISTINCT FROM b.thread_key;
CREATE UNIQUE INDEX notifications_workspace_kind_thread_key_uidx
  ON public.notifications (workspace_id, kind, thread_key);