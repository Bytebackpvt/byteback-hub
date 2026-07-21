import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listMailboxSyncStatus, listRecentLeadAudit } from "@/lib/sync-status.functions";
import { syncNow } from "@/lib/sync.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/sync-status")({
  head: () => ({
    meta: [
      { title: "Sync status · ByteBack" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SyncStatusPage,
});

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "never";
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function SyncStatusPage() {
  const callStatus = useServerFn(listMailboxSyncStatus);
  const callAudit = useServerFn(listRecentLeadAudit);
  const callSync = useServerFn(syncNow);
  const statusQ = useQuery({ queryKey: ["sync-status"], queryFn: () => callStatus() });
  const auditQ = useQuery({ queryKey: ["audit-recent"], queryFn: () => callAudit() });

  const runSync = async () => {
    try {
      await callSync();
      toast.success("Sync started");
      setTimeout(() => statusQ.refetch(), 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sync status</h1>
          <p className="text-sm text-muted-foreground">
            Per-mailbox sync health, last run, backfill counts, and errors.
          </p>
        </div>
        <Button onClick={runSync} size="sm" className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Sync now
        </Button>
      </header>

      <section className="rounded-xl border border-border/60 bg-card/60">
        <div className="border-b border-border/60 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Mailboxes
        </div>
        {statusQ.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (statusQ.data?.mailboxes.length ?? 0) === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No mailboxes connected yet. Add one from Integrations.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {statusQ.data!.mailboxes.map((m) => (
              <li key={m.mailbox + m.provider} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {m.completeness === "ok" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : m.completeness === "partial" ? (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="truncate">{m.mailbox}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                      {m.provider}
                    </span>
                    <span
                      className={
                        "rounded px-1.5 py-0.5 text-[10px] uppercase " +
                        (m.status === "active"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-red-500/10 text-red-700 dark:text-red-400")
                      }
                    >
                      {m.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{m.note}</p>
                  {m.lastError && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      Last error: {m.lastError}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>Last OK: {timeAgo(m.lastOkAt)}</div>
                  <div>Last run: {timeAgo(m.lastRunAt)}</div>
                  <div>
                    Inbox <b className="text-foreground">{m.inboxBackfilled}</b> · Sent{" "}
                    <b className="text-foreground">{m.sentBackfilled}</b> · Stored{" "}
                    <b className="text-foreground">{m.storedThreads}</b>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border/60 bg-card/60">
        <div className="border-b border-border/60 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recent stage &amp; temperature changes
        </div>
        {auditQ.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (auditQ.data?.entries.length ?? 0) === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No changes yet. Every stage or Hot/Warm/Cold change will be logged here.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {auditQ.data!.entries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline gap-2 px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{timeAgo(e.createdAt)}</span>
                <span className="font-medium">{e.actorEmail ?? "Someone"}</span>
                <span className="text-muted-foreground">changed</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {e.changeType === "stage" ? "stage" : "temperature"}
                </span>
                <span className="text-muted-foreground">
                  from <b className="text-foreground">{e.oldValue ?? "—"}</b> to{" "}
                  <b className="text-foreground">{e.newValue ?? "—"}</b>
                </span>
                <span className="ml-auto truncate text-xs text-muted-foreground">{e.leadKey}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
