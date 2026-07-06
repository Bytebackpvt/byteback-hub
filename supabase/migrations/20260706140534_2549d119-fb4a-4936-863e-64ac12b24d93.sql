
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS notifications_workspace_state_idx
  ON public.notifications(workspace_id, archived_at, pinned, created_at DESC);

-- Escalation: for every task overdue by >2h and not done, create a follow-up notification (idempotent per task/day)
CREATE OR REPLACE FUNCTION public.escalate_overdue_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r RECORD;
  thread_key_val TEXT;
BEGIN
  FOR r IN
    SELECT t.id, t.workspace_id, t.title, t.due, t.thread_id, w.owner_id
    FROM public.tasks t
    JOIN public.workspaces w ON w.id = t.workspace_id
    WHERE t.done = false
      AND t.due IS NOT NULL
      AND t.due < now() - interval '2 hours'
      AND t.due > now() - interval '7 days'
  LOOP
    thread_key_val := 'task:' || r.id || ':' || to_char(now(), 'YYYY-MM-DD');
    INSERT INTO public.notifications (workspace_id, user_id, kind, title, body, link, thread_key, meta)
    VALUES (
      r.workspace_id,
      r.owner_id,
      'followup',
      '⏰ Overdue: ' || r.title,
      'This task is more than 2 hours past due. Escalating.',
      '/app/tasks',
      thread_key_val,
      jsonb_build_object('task_id', r.id, 'escalated', true)
    )
    ON CONFLICT (workspace_id, kind, thread_key) DO NOTHING;
  END LOOP;
END;
$$;

-- Run escalation every 30 minutes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('escalate-overdue-tasks')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'escalate-overdue-tasks');
    PERFORM cron.schedule(
      'escalate-overdue-tasks',
      '*/30 * * * *',
      $cron$ SELECT public.escalate_overdue_tasks(); $cron$
    );
  END IF;
END $$;
