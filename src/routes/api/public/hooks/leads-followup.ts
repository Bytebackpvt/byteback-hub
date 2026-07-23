/**
 * Cron hook: leads follow-up + auto-close engine.
 *
 * Runs periodically (recommended: every 15 min). For each workspace:
 *  1. Auto-close open leads with no activity for `auto_close_days` -> status=dead.
 *  2. Compute `next_followup_at` for leads waiting on customer reply based on
 *     the workspace follow-up config.
 *  3. Insert in-app notifications for leads where next_followup_at has passed.
 *  4. Queue a daily email digest per workspace member (if enabled).
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/leads-followup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization")?.replace("Bearer ", "");
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (expected && auth !== expected && apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendAppEmail } = await import("@/lib/email/send-app-email.server");

        const now = Date.now();
        const stats = { closed: 0, notifications: 0, digestsSent: 0 };

        // 1) Load every workspace's config
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: configs } = await (supabaseAdmin as any)
          .from("workspace_followup_config")
          .select("workspace_id, auto_close_days, first_reminder_hours, second_reminder_hours, third_reminder_hours");
        const configByWs = new Map<string, {
          autoCloseDays: number;
          reminders: number[];
        }>();
        for (const c of (configs as Array<Record<string, unknown>>) ?? []) {
          const reminders = [
            Number(c.first_reminder_hours ?? 4),
            Number(c.second_reminder_hours ?? 24),
            Number(c.third_reminder_hours ?? 72),
          ].filter((h) => h > 0);
          configByWs.set(String(c.workspace_id), {
            autoCloseDays: Number(c.auto_close_days ?? 15),
            reminders,
          });
        }

        // 2) Also collect workspaces that have leads but no config (defaults)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: wsRows } = await (supabaseAdmin as any)
          .from("leads")
          .select("workspace_id")
          .eq("status", "open")
          .limit(1000);
        const workspaceIds = new Set<string>();
        for (const r of (wsRows as Array<Record<string, unknown>>) ?? []) {
          workspaceIds.add(String(r.workspace_id));
        }

        for (const wsId of workspaceIds) {
          const cfg = configByWs.get(wsId) ?? { autoCloseDays: 15, reminders: [4, 24, 72] };
          const autoCloseCutoff = new Date(now - cfg.autoCloseDays * 24 * 3600 * 1000).toISOString();

          // 2a) Auto-close leads
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: closed } = await (supabaseAdmin as any)
            .from("leads")
            .update({ status: "dead" })
            .eq("workspace_id", wsId)
            .eq("status", "open")
            .lt("last_activity_at", autoCloseCutoff)
            .select("id");
          stats.closed += ((closed as unknown[]) ?? []).length;

          // 2b) Load open leads that need follow-up scheduling
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: openLeads } = await (supabaseAdmin as any)
            .from("leads")
            .select("id, customer_email, customer_name, last_inbound_at, last_outbound_at, next_followup_at, snoozed_until, status")
            .eq("workspace_id", wsId)
            .in("status", ["open", "snoozed"])
            .limit(1000);

          for (const lead of (openLeads as Array<Record<string, unknown>>) ?? []) {
            const status = String(lead.status);
            const snoozedUntil = lead.snoozed_until ? new Date(String(lead.snoozed_until)).getTime() : 0;
            if (status === "snoozed" && snoozedUntil > now) continue;
            if (status === "snoozed" && snoozedUntil && snoozedUntil <= now) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabaseAdmin as any).from("leads").update({ status: "open", snoozed_until: null }).eq("id", lead.id);
            }

            const lastIn = lead.last_inbound_at ? new Date(String(lead.last_inbound_at)).getTime() : 0;
            const lastOut = lead.last_outbound_at ? new Date(String(lead.last_outbound_at)).getTime() : 0;
            // Only schedule follow-up if customer replied after our last outbound OR we never replied
            if (!lastIn || (lastOut && lastOut > lastIn)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabaseAdmin as any).from("leads").update({ next_followup_at: null }).eq("id", lead.id);
              continue;
            }

            // Anchor from last inbound; pick smallest reminder > time-elapsed-since-inbound
            const elapsedHrs = (now - lastIn) / 36e5;
            const nextH = cfg.reminders.find((h) => h > elapsedHrs);
            const nextDue = nextH
              ? new Date(lastIn + nextH * 3600 * 1000).toISOString()
              : null;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabaseAdmin as any)
              .from("leads")
              .update({ next_followup_at: nextDue })
              .eq("id", lead.id);

            // 2c) Fire notification for reminders that just came due (within last 20 min)
            const dueNow = cfg.reminders.some((h) => {
              const at = lastIn + h * 3600 * 1000;
              return at <= now && at > now - 20 * 60 * 1000;
            });
            if (dueNow) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabaseAdmin as any).from("notifications").insert({
                workspace_id: wsId,
                kind: "followup",
                title: `Follow up: ${lead.customer_name || lead.customer_email}`,
                body: `No reply from ${lead.customer_email} in ${Math.round(elapsedHrs)}h`,
                link: `/app/leads`,
                thread_key: String(lead.id),
                meta: { leadId: String(lead.id) },
              });
              stats.notifications += 1;
            }
          }
        }

        // 3) Daily digest email (only fires between 08:00-09:00 workspace TZ ~ UTC gate here)
        const hour = new Date().getUTCHours();
        if (hour === 3) {
          // 08:30 IST ~ 03:00 UTC
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: prefs } = await (supabaseAdmin as any)
            .from("notification_preferences")
            .select("user_id, email_digest_enabled, email_digest_frequency")
            .eq("email_digest_enabled", true)
            .eq("email_digest_frequency", "daily");
          for (const p of (prefs as Array<Record<string, unknown>>) ?? []) {
            const userId = String(p.user_id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: userRow } = await (supabaseAdmin as any).auth.admin.getUserById(userId);
            const email = userRow?.user?.email as string | undefined;
            if (!email) continue;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: memberships } = await (supabaseAdmin as any)
              .from("workspace_members")
              .select("workspace_id")
              .eq("user_id", userId);
            const wsIds = ((memberships as Array<Record<string, unknown>>) ?? []).map((m) => String(m.workspace_id));
            if (wsIds.length === 0) continue;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: leads } = await (supabaseAdmin as any)
              .from("leads")
              .select("customer_email, customer_name, last_inbound_at, last_outbound_at, next_followup_at, temperature")
              .in("workspace_id", wsIds)
              .eq("status", "open")
              .order("last_inbound_at", { ascending: false })
              .limit(20);
            const needing = ((leads as Array<Record<string, unknown>>) ?? []).filter((l) => {
              const li = l.last_inbound_at ? new Date(String(l.last_inbound_at)).getTime() : 0;
              const lo = l.last_outbound_at ? new Date(String(l.last_outbound_at)).getTime() : 0;
              return li && (!lo || li > lo);
            });
            if (needing.length === 0) continue;

            const rows = needing
              .slice(0, 10)
              .map((l) => {
                const li = l.last_inbound_at ? new Date(String(l.last_inbound_at)) : new Date();
                const h = Math.round((now - li.getTime()) / 36e5);
                const label = l.customer_name || l.customer_email;
                const temp = l.temperature ? `<span style="color:#dc2626;font-weight:600">${l.temperature}</span> · ` : "";
                return `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${temp}${label}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px">waiting ${h}h</td></tr>`;
              })
              .join("");
            const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="margin:0 0 4px">Your ByteBack digest</h2>
              <p style="margin:0 0 16px;color:#6b7280">${needing.length} lead${needing.length === 1 ? "" : "s"} waiting on you</p>
              <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px">${rows}</table>
              <p style="margin-top:16px"><a href="https://byteback.digital/app/leads" style="background:#0ea5e9;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">Open ByteBack</a></p>
            </div>`;
            const r = await sendAppEmail({
              to: email,
              subject: `${needing.length} lead${needing.length === 1 ? "" : "s"} waiting on you`,
              html,
              label: "daily-digest",
              idempotencyKey: `daily-digest-${userId}-${new Date().toISOString().slice(0, 10)}`,
            });
            if (r.ok) stats.digestsSent += 1;
          }
        }

        return new Response(JSON.stringify({ ok: true, stats }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
