import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, Plug2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listConnectedAccounts,
  disconnectAccount,
  type ConnectedAccount,
} from "@/lib/marketplace.functions";

export const Route = createFileRoute("/_authenticated/app/integrations/connected")({
  head: () => ({ meta: [{ title: "Connected Accounts — ByteBack" }, { name: "robots", content: "noindex" }] }),
  component: ConnectedPage,
});

function ConnectedPage() {
  const call = useServerFn(listConnectedAccounts);
  const q = useQuery({
    queryKey: ["marketplace", "connected"],
    queryFn: () => call(),
    staleTime: 15_000,
  });

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading connected accounts…
      </div>
    );
  }

  const all = [
    ...(q.data?.oauth ?? []).map((a) => ({ ...a, kind: "oauth_connection" as const })),
    ...(q.data?.accounts ?? []).map((a) => ({ ...a, kind: "workspace_integration" as const })),
    ...(q.data?.builtin ?? []).map((a) => ({ ...a, kind: "builtin" as const })),
  ];

  if (all.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 p-10 text-center">
        <Plug2 className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-3 font-medium">No integrations connected yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Head to the marketplace and connect your first tool in under 30 seconds.
        </p>
        <Button asChild className="mt-4">
          <Link to="/app/integrations">Browse marketplace</Link>
        </Button>
      </div>
    );
  }

  const stats = {
    total: all.length,
    healthy: all.filter((a) => a.health_status === "healthy").length,
    degraded: all.filter((a) => a.health_status === "degraded").length,
    error: all.filter((a) => a.health_status === "error").length,
    mailboxes: all.reduce((s, a) => s + (a.mailbox_count ?? 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Connected" value={stats.total} />
        <StatCard label="Healthy" value={stats.healthy} tone="ok" />
        <StatCard label="Needs attention" value={stats.degraded + stats.error} tone={stats.degraded + stats.error > 0 ? "warn" : "neutral"} />
        <StatCard label="Mailboxes" value={stats.mailboxes} />
      </div>

      <div className="rounded-xl border border-border/70 bg-card">
        <div className="border-b border-border/60 px-4 py-3 text-sm font-medium">Connected accounts</div>
        <ul className="divide-y divide-border/60">
          {all.map((a) => (
            <li key={`${a.kind}-${a.id}`}>
              <ConnectionRow account={a} kind={a.kind} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "ok" | "warn" }) {
  const toneClass =
    tone === "ok" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : "text-foreground";
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function ConnectionRow({
  account,
  kind,
}: {
  account: ConnectedAccount;
  kind: "workspace_integration" | "oauth_connection";
}) {
  const qc = useQueryClient();
  const callDisconnect = useServerFn(disconnectAccount);
  const disconnectMut = useMutation({
    mutationFn: () => callDisconnect({ data: { kind, id: account.id } }),
    onSuccess: () => {
      toast.success("Disconnected");
      qc.invalidateQueries({ queryKey: ["marketplace"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const healthDot =
    account.health_status === "healthy"
      ? "bg-emerald-500"
      : account.health_status === "degraded"
      ? "bg-amber-500"
      : account.health_status === "error"
      ? "bg-red-500"
      : "bg-muted-foreground";

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${healthDot}`}
        aria-label={`Status: ${account.health_status}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium capitalize">{account.provider.replace(/_/g, " ")}</span>
          {account.label && <span className="text-sm text-muted-foreground">· {account.label}</span>}
          {account.health_status === "error" && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Error
            </Badge>
          )}
          {account.health_status === "healthy" && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Healthy
            </Badge>
          )}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {account.last_sync_at ? (
            <>Last sync {formatDistanceToNow(new Date(account.last_sync_at), { addSuffix: true })}</>
          ) : (
            <>Connected {formatDistanceToNow(new Date(account.created_at), { addSuffix: true })}</>
          )}
          {account.mailbox_count > 0 && <> · {account.mailbox_count} mailbox{account.mailbox_count === 1 ? "" : "es"}</>}
        </div>
        {account.last_error_msg && (
          <div className="mt-1 text-xs text-red-500">{account.last_error_msg}</div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {account.health_status !== "healthy" && (
          <Button size="sm" variant="outline" className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Reconnect
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (confirm(`Disconnect ${account.provider}?`)) disconnectMut.mutate();
          }}
          disabled={disconnectMut.isPending}
          aria-label={`Disconnect ${account.provider}`}
        >
          {disconnectMut.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
