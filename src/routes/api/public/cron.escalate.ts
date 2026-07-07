import { createFileRoute } from "@tanstack/react-router";

/**
 * Public cron endpoint — runs the `escalate_overdue_tasks()` DB function,
 * which creates escalation notifications for tasks > 2h past due.
 *
 * Schedule via pg_cron:
 *   POST /api/public/cron/escalate
 *   Authorization: Bearer <DIGEST_CRON_SECRET>
 * Recommended cadence: every 15 minutes.
 */
export const Route = createFileRoute("/api/public/cron/escalate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const expected = `Bearer ${process.env.DIGEST_CRON_SECRET ?? ""}`;
        if (!process.env.DIGEST_CRON_SECRET || auth !== expected) {
          return new Response("unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabaseAdmin as any).rpc("escalate_overdue_tasks");
        if (error) {
          console.error("[cron.escalate] rpc failed", error);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        return Response.json({ ok: true, at: new Date().toISOString() });
      },
    },
  },
});
