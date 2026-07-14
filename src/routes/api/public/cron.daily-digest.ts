import { createFileRoute } from "@tanstack/react-router";

/**
 * Public cron endpoint — sends the daily digest email to every user who has
 * `digest.email = true` in their notification preferences.
 *
 * Called by pg_cron / external scheduler:
 *   POST /api/public/cron/daily-digest
 *   Authorization: Bearer <DIGEST_CRON_SECRET>
 */
export const Route = createFileRoute("/api/public/cron/daily-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const expected = `Bearer ${process.env.DIGEST_CRON_SECRET ?? ""}`;
        if (!process.env.DIGEST_CRON_SECRET || auth !== expected) {
          return new Response("unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { sendAppEmail } = await import(
          "@/lib/email/send-app-email.server"
        );

        // Users opted into email digest.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: prefs, error: prefErr } = await (supabaseAdmin as any)
          .from("notification_preferences")
          .select("user_id, workspace_id, prefs, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, timezone");
        if (prefErr) throw prefErr;

        type PrefRow = {
          user_id: string;
          workspace_id: string;
          prefs: Record<string, Record<string, boolean>> | null;
          quiet_hours_enabled: boolean;
          quiet_hours_start: number;
          quiet_hours_end: number;
          timezone: string;
        };
        const wantsDigest = ((prefs ?? []) as PrefRow[]).filter(
          (r) => r.prefs?.digest?.email === true,
        );
        if (wantsDigest.length === 0) {
          return Response.json({ ok: true, sent: 0 });
        }

        const { isInQuietHours } = await import(
          "@/lib/notification-prefs.functions"
        );

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        let sent = 0;
        let skipped = 0;

        for (const row of wantsDigest) {
          const quiet = {
            enabled: row.quiet_hours_enabled,
            start: row.quiet_hours_start,
            end: row.quiet_hours_end,
            timezone: row.timezone,
          };
          if (isInQuietHours(quiet)) {
            skipped += 1;
            continue;
          }

          // Aggregate last 24h for this workspace.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: notifs } = await (supabaseAdmin as any)
            .from("notifications")
            .select("kind, title, created_at")
            .eq("workspace_id", row.workspace_id)
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(50);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: openTasks } = await (supabaseAdmin as any)
            .from("tasks")
            .select("id")
            .eq("workspace_id", row.workspace_id)
            .eq("done", false);

          const notifRows = (notifs ?? []) as Array<{ kind: string; title: string }>;
          if (notifRows.length === 0 && (openTasks?.length ?? 0) === 0) {
            skipped += 1;
            continue;
          }

          const counts = notifRows.reduce<Record<string, number>>((acc, n) => {
            acc[n.kind] = (acc[n.kind] ?? 0) + 1;
            return acc;
          }, {});

          const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
          const toEmail = userRes?.user?.email;
          if (!toEmail) continue;

          const topLines = notifRows
            .slice(0, 8)
            .map((n) => `<li style="margin:4px 0">${escapeHtml(n.title)}</li>`)
            .join("");

          const summaryLine = [
            counts.hot_lead ? `${counts.hot_lead} hot lead${counts.hot_lead > 1 ? "s" : ""}` : null,
            counts.new_reply ? `${counts.new_reply} new repl${counts.new_reply > 1 ? "ies" : "y"}` : null,
            counts.followup ? `${counts.followup} follow-up${counts.followup > 1 ? "s" : ""}` : null,
            counts.lost_lead ? `${counts.lost_lead} lost lead${counts.lost_lead > 1 ? "s" : ""}` : null,
            openTasks?.length ? `${openTasks.length} open task${openTasks.length > 1 ? "s" : ""}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Quiet day 🎉";

          const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;padding:24px;color:#0f172a">
            <h2 style="margin:0 0 4px 0;font-size:20px">Your ByteBack daily digest</h2>
            <p style="margin:0 0 20px 0;color:#475569;font-size:14px">${escapeHtml(summaryLine)}</p>
            ${topLines ? `<ul style="padding:0 0 0 18px;color:#334155;font-size:14px">${topLines}</ul>` : ""}
            <p style="margin:24px 0 0 0"><a href="https://byteback.digital/app/inbox" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Open ByteBack</a></p>
          </div>`;

          const today = new Date().toISOString().slice(0, 10);
          const res = await sendAppEmail({
            to: toEmail,
            label: "daily-digest",
            idempotencyKey: `digest-${row.user_id}-${today}`,
            subject: `Daily digest — ${summaryLine}`,
            html,
          });
          if (res.ok) sent += 1;
          else skipped += 1;
        }

        return Response.json({ ok: true, sent, skipped, considered: wantsDigest.length });
      },
    },
  },
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
