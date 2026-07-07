import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckSquare,
  Flame,
  Inbox,
  Loader2,
  Mail,
  Reply,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { generatePriorityActions, type PriorityAction } from "@/lib/ai.functions";
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
  const callBriefing = useServerFn(generatePriorityActions);

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

      {/* AI briefing v2 — explainable priority ranking */}
      <section className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 via-brand/5 to-transparent p-6">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
          <Sparkles className="h-3.5 w-3.5" /> Today's priority actions
        </div>
        {briefingQuery.isLoading || briefingQuery.isFetching ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Ranking your day…
          </div>
        ) : briefingQuery.error ? (
          <p className="text-sm text-rose-500">
            {briefingQuery.error instanceof Error
              ? briefingQuery.error.message
              : "Failed to generate briefing"}
          </p>
        ) : briefingQuery.data?.actions?.length ? (
          <div className="space-y-3">
            {briefingQuery.data.headline && (
              <p className="text-sm font-medium leading-snug text-foreground/90">
                {briefingQuery.data.headline}
              </p>
            )}
            <ol className="space-y-2">
              {briefingQuery.data.actions.map((a) => (
                <PriorityRow key={`${a.priority}-${a.title}`} action={a} />
              ))}
            </ol>
          </div>
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
            <div className="flex flex-col items-start gap-2 py-6">
              <p className="text-sm text-muted-foreground">
                <Mail className="mr-1.5 inline h-3.5 w-3.5" /> No hot threads right now.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/app/inbox">Open inbox</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {hot.map((t) => (
                <li key={t.id}>
                  <Link
                    to="/app/inbox"
                    className="flex items-center gap-3 rounded-md py-2.5 px-1 -mx-1 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Open thread from ${t.from.name} at ${t.from.company}: ${t.subject}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {t.from.name}{" "}
                        <span className="text-muted-foreground">· {t.from.company}</span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {t.subject}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-brand">
                      <Reply className="inline h-3 w-3" aria-hidden="true" /> Reply
                    </span>
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

const URGENCY_STYLE: Record<PriorityAction["urgency"], string> = {
  now: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  today: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  this_week: "bg-muted text-muted-foreground border-border",
};

const CATEGORY_ICON: Record<PriorityAction["category"], typeof Inbox> = {
  reply: Reply,
  task: CheckSquare,
  followup: Mail,
  review: BarChart3,
};

function PriorityRow({ action }: { action: PriorityAction }) {
  const Icon = CATEGORY_ICON[action.category];
  return (
    <li className="flex gap-3 rounded-xl border border-border/50 bg-background/50 p-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-bold text-brand">
        {action.priority}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{action.title}</span>
            </div>
            {action.target && (
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {action.target}
              </div>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
              URGENCY_STYLE[action.urgency],
            )}
          >
            {action.urgency === "this_week" ? "this week" : action.urgency}
          </span>
        </div>
        <p className="mt-1.5 flex items-start gap-1 text-xs leading-relaxed text-muted-foreground">
          <Flame className="mt-0.5 h-3 w-3 shrink-0 text-brand" />
          <span>{action.reason}</span>
        </p>
        {action.signals.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {action.signals.map((s) => (
              <span
                key={s}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

