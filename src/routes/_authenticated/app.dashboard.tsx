import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Flame, Clock, Inbox, CheckSquare, Sparkles, User, ArrowRight } from "lucide-react";
import { getDashboard, type DashRow, type ActivityRow, type DashTask } from "@/lib/dashboard.functions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ByteBack" },
      { name: "description", content: "Your action cockpit: hot leads, follow-ups due, unreplied threads and today's tasks." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const call = useServerFn(getDashboard);
  const q = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => call(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const d = q.data;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const total = (d?.counts.hot ?? 0) + (d?.counts.followup ?? 0) + (d?.counts.unreplied ?? 0);

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{greet}</h1>
          <p className="text-sm text-muted-foreground">
            {q.isLoading
              ? "Loading your day…"
              : total === 0
                ? "All caught up — nothing urgent right now."
                : `${total} things need your attention now.`}
          </p>
        </div>
        <Link
          to="/app/inbox"
          className="text-xs text-brand hover:underline inline-flex items-center gap-1"
        >
          Open Inbox <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          title="Hot leads waiting"
          icon={<Flame className="h-4 w-4 text-red-500" />}
          count={d?.counts.hot ?? 0}
          tone="hot"
          rows={d?.hotLeads ?? []}
          empty="No hot leads waiting — nice."
        />
        <Card
          title="Follow-up pending"
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          count={d?.counts.followup ?? 0}
          tone="warm"
          rows={d?.followupsDue ?? []}
          empty="Nothing to follow up on."
        />
        <Card
          title="Unreplied > 4h"
          icon={<Inbox className="h-4 w-4 text-blue-500" />}
          count={d?.counts.unreplied ?? 0}
          tone="cool"
          rows={d?.unreplied ?? []}
          empty="Every recent email has a reply."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TasksCard tasks={d?.tasks ?? []} loading={q.isLoading} />
        <ActivityCard activity={d?.activity ?? []} loading={q.isLoading} />
      </div>
    </div>
  );
}

function Card({
  title,
  icon,
  count,
  tone,
  rows,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  tone: "hot" | "warm" | "cool";
  rows: DashRow[];
  empty: string;
}) {
  const toneCls =
    tone === "hot"
      ? "border-red-500/30"
      : tone === "warm"
        ? "border-amber-500/30"
        : "border-blue-500/30";
  return (
    <div className={cn("rounded-lg border bg-card shadow-sm", toneCls)}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </div>
        <span className="text-xs font-semibold text-muted-foreground">{count}</span>
      </div>
      <ul className="divide-y">
        {rows.length === 0 && (
          <li className="p-3 text-xs text-muted-foreground">{empty}</li>
        )}
        {rows.map((r) => (
          <li key={r.threadId}>
            <Link
              to="/app/inbox"
              search={{ thread: r.threadId } as never}
              className="flex flex-col gap-0.5 px-3 py-2 hover:bg-muted/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{r.from}</span>
                <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                  {r.waited}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs text-muted-foreground flex-1">
                  {r.subject}
                </span>
                {r.temperature && (
                  <Badge variant="outline" className="h-4 px-1 text-[9px] uppercase">
                    {r.temperature}
                  </Badge>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TasksCard({ tasks, loading }: { tasks: DashTask[]; loading: boolean }) {
  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CheckSquare className="h-4 w-4 text-emerald-500" />
          Priority tasks
        </div>
        <Link to="/app/tasks" className="text-xs text-brand hover:underline">
          All tasks
        </Link>
      </div>
      <ul className="divide-y">
        {loading && <li className="p-3 text-xs text-muted-foreground">Loading…</li>}
        {!loading && tasks.length === 0 && (
          <li className="p-3 text-xs text-muted-foreground">No open tasks.</li>
        )}
        {tasks.slice(0, 10).map((t) => {
          const overdue = t.due && new Date(t.due) < new Date();
          const inner = (
            <>
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  t.priority === "high"
                    ? "bg-red-500"
                    : t.priority === "med"
                      ? "bg-amber-500"
                      : "bg-slate-400",
                )}
              />
              <span className="flex-1 truncate">{t.title}</span>
              {t.due && (
                <span
                  className={cn(
                    "whitespace-nowrap text-[10px]",
                    overdue ? "font-semibold text-red-500" : "text-muted-foreground",
                  )}
                >
                  {new Date(t.due).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </>
          );
          return (
            <li key={t.id}>
              {t.thread_id ? (
                <Link
                  to="/app/inbox"
                  search={{ thread: t.thread_id } as never}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50"
                >
                  {inner}
                </Link>
              ) : (
                <Link
                  to="/app/tasks"
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50"
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ActivityCard({ activity, loading }: { activity: ActivityRow[]; loading: boolean }) {
  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-brand" />
          Recent AI & manual changes
        </div>
        <Link to="/app/activity" className="text-xs text-brand hover:underline">
          Full log
        </Link>
      </div>
      <ul className="divide-y">
        {loading && <li className="p-3 text-xs text-muted-foreground">Loading…</li>}
        {!loading && activity.length === 0 && (
          <li className="p-3 text-xs text-muted-foreground">No recent activity yet.</li>
        )}
        {activity.slice(0, 12).map((a) => {
          const inner = (
            <>
              {a.kind === "ai" ? (
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-brand" />
              ) : (
                <User className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium">{a.title}</span>
                  <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                    {new Date(a.at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {a.detail && (
                  <div className="truncate text-muted-foreground">{a.detail}</div>
                )}
                <div className="text-[10px] text-muted-foreground/70">by {a.actor}</div>
              </div>
            </>
          );
          return (
            <li key={a.id}>
              {a.threadId ? (
                <Link
                  to="/app/inbox"
                  search={{ thread: a.threadId } as never}
                  className="flex gap-2 px-3 py-2 text-xs hover:bg-muted/50"
                >
                  {inner}
                </Link>
              ) : (
                <div className="flex gap-2 px-3 py-2 text-xs">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
