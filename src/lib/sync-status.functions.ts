import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";

export type MailboxSyncStatus = {
  mailbox: string;
  provider: string;
  status: string;
  lastError: string | null;
  lastRunAt: string | null;
  lastOkAt: string | null;
  inboxBackfilled: number;
  sentBackfilled: number;
  storedThreads: number;
  completeness: "ok" | "partial" | "unknown";
  note: string;
};

export type RecentAuditEntry = {
  id: string;
  leadKey: string;
  changeType: "stage" | "manual_status";
  oldValue: string | null;
  newValue: string | null;
  actorEmail: string | null;
  createdAt: string;
};

export const listMailboxSyncStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { mailboxes: [] as MailboxSyncStatus[] };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const [conns, syncs, threads] = await Promise.all([
      sb
        .from("oauth_connections")
        .select("account_email, provider, status, last_error, updated_at, meta")
        .eq("workspace_id", workspaceId),
      sb
        .from("sync_state")
        .select("source, last_run_at, last_ok_at, last_error, stats")
        .eq("workspace_id", workspaceId),
      sb
        .from("email_threads")
        .select("mailbox, meta")
        .eq("workspace_id", workspaceId)
        .limit(5000),
    ]);

    const connRows = (conns.data ?? []) as Array<{
      account_email: string;
      provider: string;
      status: string;
      last_error: string | null;
      updated_at: string;
      meta: Record<string, unknown> | null;
    }>;
    const syncRows = (syncs.data ?? []) as Array<{
      source: string;
      last_run_at: string | null;
      last_ok_at: string | null;
      last_error: string | null;
      stats: Record<string, unknown> | null;
    }>;
    const threadRows = (threads.data ?? []) as Array<{
      mailbox: string | null;
      meta: Record<string, unknown> | null;
    }>;

    const threadCountsByMailbox = new Map<string, { total: number; sent: number }>();
    for (const t of threadRows) {
      const mb = String(t.mailbox ?? "").toLowerCase();
      if (!mb) continue;
      const cur = threadCountsByMailbox.get(mb) ?? { total: 0, sent: 0 };
      cur.total += 1;
      const dir = t.meta && (t.meta as { direction?: string }).direction;
      if (dir === "out") cur.sent += 1;
      threadCountsByMailbox.set(mb, cur);
    }

    const mailboxes: MailboxSyncStatus[] = connRows.map((c) => {
      const key = String(c.account_email ?? "").toLowerCase();
      const sync = syncRows.find((s) => s.source.toLowerCase().includes(key));
      const stats = (sync?.stats ?? {}) as {
        inbox_backfilled?: number;
        sent_backfilled?: number;
      };
      const counts = threadCountsByMailbox.get(key) ?? { total: 0, sent: 0 };
      const inboxBack = Number(stats.inbox_backfilled ?? 0);
      const sentBack = Number(stats.sent_backfilled ?? 0);
      const expected = inboxBack + sentBack;
      let completeness: "ok" | "partial" | "unknown" = "unknown";
      let note = "";
      if (c.status !== "active") {
        completeness = "partial";
        note = c.last_error ? `Connection error: ${c.last_error}` : "Reconnect this mailbox.";
      } else if (expected > 0 && counts.total < expected * 0.85) {
        completeness = "partial";
        note = `Only ${counts.total} of ~${expected} messages are indexed. Re-run sync to backfill the rest.`;
      } else if (expected > 0) {
        completeness = "ok";
        note = `All ~${expected} messages synced.`;
      } else {
        note = "No sync has run yet for this mailbox.";
      }

      return {
        mailbox: c.account_email,
        provider: c.provider,
        status: c.status,
        lastError: c.last_error ?? sync?.last_error ?? null,
        lastRunAt: sync?.last_run_at ?? null,
        lastOkAt: sync?.last_ok_at ?? c.updated_at ?? null,
        inboxBackfilled: inboxBack,
        sentBackfilled: sentBack,
        storedThreads: counts.total,
        completeness,
        note,
      };
    });

    return { mailboxes };
  });

export const listRecentLeadAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { entries: [] as RecentAuditEntry[] };
    const { data } = await context.supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("lead_audit_log" as any)
      .select("id, lead_key, change_type, old_value, new_value, actor_email, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(50);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries: RecentAuditEntry[] = ((data as any[]) ?? []).map((r) => ({
      id: String(r.id),
      leadKey: String(r.lead_key),
      changeType: r.change_type as "stage" | "manual_status",
      oldValue: (r.old_value as string | null) ?? null,
      newValue: (r.new_value as string | null) ?? null,
      actorEmail: (r.actor_email as string | null) ?? null,
      createdAt: String(r.created_at),
    }));
    return { entries };
  });
