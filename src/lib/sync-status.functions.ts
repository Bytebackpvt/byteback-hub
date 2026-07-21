import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";

export type SenderCount = { email: string; count: number };

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
  storedReceived: number;
  storedSent: number;
  uniqueSenders: number;
  topSenders: SenderCount[];
  missingSenders: SenderCount[];
  completeness: "ok" | "partial" | "unknown";
  note: string;
  syncParams: {
    label: string;
    value: string;
  }[];
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

const SyncStatusInput = z
  .object({
    topSendersLimit: z.number().int().min(1).max(50).optional(),
  })
  .optional();

export const listMailboxSyncStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SyncStatusInput.parse(raw) ?? {})
  .handler(async ({ data, context }) => {
    const topSendersLimit = data?.topSendersLimit ?? 10;
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
        .select("mailbox, contact_email, meta")
        .eq("workspace_id", workspaceId)
        .limit(10000),
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
      contact_email: string | null;
      meta: Record<string, unknown> | null;
    }>;

    // Group threads by (lowercased) mailbox with counts + per-sender breakdown.
    type MBAgg = {
      total: number;
      sent: number;
      received: number;
      senders: Map<string, number>;
    };
    const perMailbox = new Map<string, MBAgg>();
    for (const t of threadRows) {
      const mb = String(t.mailbox ?? "").toLowerCase();
      if (!mb) continue;
      let cur = perMailbox.get(mb);
      if (!cur) {
        cur = { total: 0, sent: 0, received: 0, senders: new Map() };
        perMailbox.set(mb, cur);
      }
      cur.total += 1;
      const dir = t.meta && (t.meta as { direction?: string }).direction;
      if (dir === "out") cur.sent += 1;
      else cur.received += 1;
      const sender = String(t.contact_email ?? "").toLowerCase();
      if (sender) cur.senders.set(sender, (cur.senders.get(sender) ?? 0) + 1);
    }

    const mailboxes: MailboxSyncStatus[] = connRows.map((c) => {
      const key = String(c.account_email ?? "").toLowerCase();
      const sync =
        syncRows.find((s) => s.source.toLowerCase().includes(key)) ??
        syncRows.find(
          (s) =>
            s.source.toLowerCase().startsWith("gmail:") ||
            s.source.toLowerCase() === c.provider.toLowerCase(),
        );
      const stats = (sync?.stats ?? {}) as {
        inbox_backfilled?: number;
        sent_backfilled?: number;
        processed?: number;
        skipped?: number;
      };
      const agg = perMailbox.get(key) ?? {
        total: 0,
        sent: 0,
        received: 0,
        senders: new Map<string, number>(),
      };
      const inboxBack = Number(stats.inbox_backfilled ?? stats.processed ?? 0);
      const sentBack = Number(stats.sent_backfilled ?? 0);
      const expected = inboxBack + sentBack;

      // Rank senders (most frequent first) and flag "missing" as senders we've
      // seen only once — those are the most likely candidates for messages
      // that didn't fully paginate.
      const senderList: SenderCount[] = Array.from(agg.senders.entries())
        .map(([email, count]) => ({ email, count }))
        .sort((a, b) => b.count - a.count);
      const topSenders = senderList.slice(0, topSendersLimit);
      const missingSenders = senderList
        .filter((s) => s.count === 1)
        .slice(0, topSendersLimit);

      let completeness: "ok" | "partial" | "unknown" = "unknown";
      let note = "";
      if (c.status !== "active") {
        completeness = "partial";
        note = c.last_error ? `Connection error: ${c.last_error}` : "Reconnect this mailbox.";
      } else if (expected > 0 && agg.total < expected * 0.85) {
        completeness = "partial";
        note = `Only ${agg.total} of ~${expected} messages indexed (${agg.received} received, ${agg.sent} sent). Load more from the Unibox or re-run sync.`;
      } else if (expected > 0) {
        completeness = "ok";
        note = `All ~${expected} messages synced (${agg.received} received, ${agg.sent} sent, ${senderList.length} unique senders).`;
      } else if (agg.total > 0) {
        completeness = "ok";
        note = `${agg.total} messages indexed (${agg.received} received, ${agg.sent} sent, ${senderList.length} unique senders).`;
      } else {
        note = "No sync has run yet for this mailbox.";
      }

      const syncParams: MailboxSyncStatus["syncParams"] = c.provider === "gmail"
        ? [
            { label: "Labels", value: "INBOX + SENT" },
            { label: "Page size", value: "500 messages" },
            { label: "Time window", value: "Full history (no cap)" },
            { label: "Cursor", value: "Gmail message id set (last 500 retained)" },
          ]
        : [
            { label: "Endpoint", value: "GET /api/v2/emails" },
            { label: "Page size", value: "100 per page" },
            { label: "Time window", value: "Last 90 days (i_date_from)" },
            { label: "Pages loaded", value: "up to 30 per direction (received+sent)" },
          ];

      return {
        mailbox: c.account_email,
        provider: c.provider,
        status: c.status,
        lastError: c.last_error ?? sync?.last_error ?? null,
        lastRunAt: sync?.last_run_at ?? null,
        lastOkAt: sync?.last_ok_at ?? c.updated_at ?? null,
        inboxBackfilled: inboxBack,
        sentBackfilled: sentBack,
        storedThreads: agg.total,
        storedReceived: agg.received,
        storedSent: agg.sent,
        uniqueSenders: senderList.length,
        topSenders,
        missingSenders,
        completeness,
        note,
        syncParams,
      };
    });

    return { mailboxes };
  });

const AuditInput = z
  .object({
    limit: z.number().int().min(10).max(500).optional(),
  })
  .optional();

export const listRecentLeadAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => AuditInput.parse(raw) ?? {})
  .handler(async ({ data, context }) => {
    const limit = data?.limit ?? 50;
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { entries: [] as RecentAuditEntry[], hasMore: false };
    const { data: rows } = await context.supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("lead_audit_log" as any)
      .select("id, lead_key, change_type, old_value, new_value, actor_email, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit + 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (rows as any[]) ?? [];
    const hasMore = raw.length > limit;
    const entries: RecentAuditEntry[] = raw.slice(0, limit).map((r) => ({
      id: String(r.id),
      leadKey: String(r.lead_key),
      changeType: r.change_type as "stage" | "manual_status",
      oldValue: (r.old_value as string | null) ?? null,
      newValue: (r.new_value as string | null) ?? null,
      actorEmail: (r.actor_email as string | null) ?? null,
      createdAt: String(r.created_at),
    }));
    return { entries, hasMore };
  });
