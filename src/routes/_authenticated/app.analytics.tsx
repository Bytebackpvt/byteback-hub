import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckCircle2,
  Flame,
  Inbox,
  Mail,
  Plug,
  Send,
  Sparkles,
  TrendingUp,
  UserPlus,
} from "lucide-react";

import { getWorkspaceAnalytics } from "@/lib/analytics.functions";
import { getInstantlyAnalytics } from "@/lib/instantly.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/analytics")({
  component: AnalyticsPage,
});

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

function AnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const callWorkspace = useServerFn(getWorkspaceAnalytics);
  const callInstantly = useServerFn(getInstantlyAnalytics);

  const wq = useQuery({
    queryKey: ["analytics", "workspace", days],
    queryFn: () => callWorkspace({ data: { days } }),
    staleTime: 60_000,
  });

  const iq = useQuery({
    queryKey: ["analytics", "instantly"],
    queryFn: () => callInstantly(),
    staleTime: 5 * 60_000,
  });

  const w = wq.data;
  const instantlyConnected = iq.data?.connected === true;
  const instantly = iq.data && "analytics" in iq.data ? iq.data.analytics : null;

  const stats = [
    {
      icon: Inbox,
      label: "Replies received",
      value: (w?.totals.threads ?? 0).toLocaleString(),
      sub: `${w?.totals.replyRatePct ?? 0}% interested`,
    },
    {
      icon: Flame,
      label: "Hot leads",
      value: (w?.totals.hotLeads ?? 0).toLocaleString(),
      sub: `${w?.totals.dealsCreated ?? 0} deals created`,
      tone: "hot" as const,
    },
    {
      icon: UserPlus,
      label: "New contacts",
      value: (w?.totals.newContacts ?? 0).toLocaleString(),
      sub: `Last ${days} days`,
      tone: "good" as const,
    },
    {
      icon: CheckCircle2,
      label: "Tasks done",
      value: (w?.totals.tasksDone ?? 0).toLocaleString(),
      sub: `${w?.totals.tasksOpen ?? 0} open`,
      tone: "good" as const,
    },
  ];

  const hasAny =
    !!w &&
    (w.totals.threads > 0 ||
      w.totals.newContacts > 0 ||
      w.totals.dealsCreated > 0 ||
      w.totals.tasksDone > 0);

  return (
    <div className="mx-auto h-[calc(100dvh-3rem)] max-w-6xl overflow-y-auto px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-xs text-muted-foreground">
            Workspace performance across your inbox, pipeline and tasks.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition",
                days === r.days
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Stat key={s.label} icon={s.icon} label={s.label} value={s.value} sub={s.sub} tone={s.tone} />
        ))}
      </div>

      {!hasAny && !wq.isLoading && (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-brand" />
          <div className="mt-2 text-sm font-medium">No activity in the last {days} days yet</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Connect a mailbox or campaign tool to start seeing live analytics.
          </p>
          <Link
            to="/app/integrations"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <Plug className="h-3.5 w-3.5" /> Connect an integration
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Activity</div>
              <div className="text-xs text-muted-foreground">Replies vs hot leads · last {days} days</div>
            </div>
            <TrendingUp className="h-4 w-4 text-brand" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={w?.daily ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "hsl(var(--accent))" }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="threads" stroke="oklch(0.62 0.22 274)" strokeWidth={2} dot={false} name="Replies" />
              <Line type="monotone" dataKey="hot" stroke="hsl(0 70% 55%)" strokeWidth={2} dot={false} name="Hot" />
              <Line type="monotone" dataKey="contacts" stroke="hsl(150 60% 45%)" strokeWidth={2} dot={false} name="New contacts" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4">
            <div className="text-sm font-semibold">Reply categories</div>
            <div className="text-xs text-muted-foreground">AI-classified inbound</div>
          </div>
          {w && w.categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={w.categoryBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {w.categoryBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
              No replies yet
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-4 w-4 text-brand" />
            <div>
              <div className="text-sm font-semibold">Per-mailbox performance</div>
              <div className="text-xs text-muted-foreground">Threads received per mailbox</div>
            </div>
          </div>
          {w && w.mailboxes.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={w.mailboxes} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="mailbox"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="threads" fill="oklch(0.62 0.22 274)" radius={[0, 6, 6, 0]} name="Threads" />
                <Bar dataKey="hot" fill="hsl(0 70% 55%)" radius={[0, 6, 6, 0]} name="Hot" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[240px] items-center justify-center text-xs text-muted-foreground">
              No mailbox activity yet
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <div>
              <div className="text-sm font-semibold">Pipeline distribution</div>
              <div className="text-xs text-muted-foreground">Deals created in this range</div>
            </div>
          </div>
          {w && w.pipeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={w.pipeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="oklch(0.65 0.2 300)" radius={[6, 6, 0, 0]} name="Deals" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[240px] items-center justify-center text-xs text-muted-foreground">
              No deals yet
            </div>
          )}
        </div>
      </div>

      {instantlyConnected && instantly && (
        <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-brand" />
              <div>
                <div className="text-sm font-semibold">Instantly campaigns</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Plug aria-hidden="true" className="h-3 w-3 text-emerald-500" />
                  Live from Instantly
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniStat label="Emails sent" value={instantly.emailsSent.toLocaleString()} />
            <MiniStat label="Opens" value={instantly.opens.toLocaleString()} />
            <MiniStat label="Replies" value={instantly.replies.toLocaleString()} />
            <MiniStat label="Opportunities" value={instantly.opportunities.toLocaleString()} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Inbox;
  label: string;
  value: string;
  sub: string;
  tone?: "good" | "hot";
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon
          className={
            tone === "hot"
              ? "h-4 w-4 text-rose-500"
              : tone === "good"
                ? "h-4 w-4 text-emerald-500"
                : "h-4 w-4 text-brand"
          }
        />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{value}</div>
    </div>
  );
}
