import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckSquare,
  Inbox,
  Loader2,
  Mail,
  Reply,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { generateDailyBriefing } from "@/lib/ai.functions";
import {
  getInstantlyAnalytics,
  listInstantlyThreads,
} from "@/lib/instantly.functions";
import { listTasks } from "@/lib/tasks.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const callThreads = useServerFn(listInstantlyThreads);
  const callAnalytics = useServerFn(getInstantlyAnalytics);
  const callTasks = useServerFn(listTasks);
  const callBriefing = useServerFn(generateDailyBriefing);

  const threadsQuery = useQuery({
    queryKey: ["instantly", "threads"],
    queryFn: () => callThreads(),
    staleTime: 30_000,
  });
  const analyticsQuery = useQuery({
    queryKey: ["instantly", "analytics"],
    queryFn: () => callAnalytics(),
    staleTime: 60_000,
  });
  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: () => callTasks(),
    staleTime: 30_000,
  });

  const threads = threadsQuery.data?.threads ?? [];
  const tasks = tasksQuery.data?.tasks ?? [];
  const analytics =
    analyticsQuery.data?.connected === true ? analyticsQuery.data.analytics : null;

  const unread = threads.filter((t) => t.unread).length;
  const hot = threads.filter((t) => t.priority === "hot").slice(0, 5);
  const openTasks = tasks.filter((t) => !t.done);

  const briefingInput = useMemo(
    () => ({
      senderName: "there",
      unreadCount: unread,
      hotThreads: hot.map((t) => ({
        from: t.from.name,
        company: t.from.company,
        subject: t.subject,
        category: t.category,
      })),
      openTasks: openTasks.slice(0, 8).map((t) => ({
        title: t.title,
        priority: t.priority,
      })),
      metrics: analytics
        ? {
            sent: analytics.emailsSent,
            replies: analytics.replies,
            opportunities: analytics.opportunities,
          }
        : undefined,
    }),
    [unread, hot, openTasks, analytics],
  );

  const briefingQuery = useQuery({
    queryKey: ["ai", "briefing", briefingInput],
    queryFn: () => callBriefing({ data: briefingInput }),
    enabled: !threadsQuery.isLoading && !tasksQuery.isLoading,
    staleTime: 5 * 60_000,
  });

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => briefingQuery.refetch()}>
          {briefingQuery.isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Refresh briefing
        </Button>
      </header>

      {/* AI briefing */}
      <section className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 via-brand/5 to-transparent p-6">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
          <Sparkles className="h-3.5 w-3.5" /> Today's briefing
        </div>
        {briefingQuery.isLoading || briefingQuery.isFetching ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Synthesizing your day…
          </div>
        ) : briefingQuery.data?.briefing ? (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {briefingQuery.data.briefing}
          </div>
        ) : briefingQuery.error ? (
          <p className="text-sm text-rose-500">
            {briefingQuery.error instanceof Error
              ? briefingQuery.error.message
              : "Failed to generate briefing"}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing urgent right now. Enjoy the quiet.
          </p>
        )}
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={Inbox}
          label="Unread replies"
          value={unread}
          hint={`${threads.length} total`}
          to="/app/inbox"
        />
        <StatCard
          icon={Zap}
          label="Hot leads"
          value={hot.length}
          hint="Need reply today"
          to="/app/inbox"
          accent
        />
        <StatCard
          icon={CheckSquare}
          label="Open tasks"
          value={openTasks.length}
          hint={`${openTasks.filter((t) => t.priority === "high").length} high priority`}
          to="/app/tasks"
        />
        <StatCard
          icon={TrendingUp}
          label="Opportunities"
          value={analytics?.opportunities ?? 0}
          hint={`${analytics?.replies ?? 0} replies · ${analytics?.emailsSent ?? 0} sent`}
          to="/app/analytics"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Hot threads */}
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Hot replies</h2>
            <Link
              to="/app/inbox"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Open inbox <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {threadsQuery.isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : hot.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              <Mail className="mr-1.5 inline h-3.5 w-3.5" /> No hot threads.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {hot.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {t.from.name}{" "}
                      <span className="text-muted-foreground">· {t.from.company}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t.subject}
                    </div>
                  </div>
                  <Link
                    to="/app/inbox"
                    className="shrink-0 text-xs text-brand hover:underline"
                  >
                    <Reply className="inline h-3 w-3" /> Reply
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Priority tasks */}
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Top tasks</h2>
            <Link
              to="/app/tasks"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Open tasks <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {tasksQuery.isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : openTasks.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              <CheckSquare className="mr-1.5 inline h-3.5 w-3.5" /> Inbox zero on tasks.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {openTasks.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                      t.priority === "high" && "bg-rose-500/15 text-rose-500",
                      t.priority === "med" && "bg-amber-500/15 text-amber-600",
                      t.priority === "low" && "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.priority}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{t.title}</div>
                    {t.linked_to && (
                      <div className="truncate text-xs text-muted-foreground">
                        {t.linked_to}
                      </div>
                    )}
                  </div>
                  {t.source === "ai" && (
                    <Sparkles className="h-3 w-3 shrink-0 text-brand" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Analytics glance */}
      {analytics && (
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">This week at a glance</h2>
            <Link
              to="/app/analytics"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <BarChart3 className="h-3 w-3" /> Full analytics
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <MiniStat label="Sent" value={analytics.emailsSent} />
            <MiniStat label="Opens" value={analytics.opens} />
            <MiniStat label="Replies" value={analytics.replies} />
            <MiniStat label="New leads" value={analytics.newLeads} />
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  to,
  accent,
}: {
  icon: typeof Inbox;
  label: string;
  value: number;
  hint: string;
  to: string;
  accent?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group rounded-2xl border p-4 transition hover:shadow-sm",
        accent
          ? "border-brand/40 bg-gradient-to-br from-brand/10 to-transparent"
          : "border-border/60 bg-card",
      )}
    >
      <div className="flex items-center justify-between">
        <Icon className={cn("h-4 w-4", accent ? "text-brand" : "text-muted-foreground")} />
        <ArrowRight className="h-3 w-3 opacity-0 transition group-hover:opacity-60" />
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs font-medium">{label}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xl font-semibold tracking-tight">
        {value.toLocaleString()}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
