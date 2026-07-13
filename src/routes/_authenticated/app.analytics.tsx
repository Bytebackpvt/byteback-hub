import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Clock,
  Flame,
  Inbox,
  MailOpen,
  Plug,
  Send,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { getInstantlyAnalytics } from "@/lib/instantly.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/analytics")({
  component: AnalyticsPage,
});

function pct(part: number, whole: number) {
  if (!whole) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function AnalyticsPage() {
  const callAnalytics = useServerFn(getInstantlyAnalytics);
  const q = useQuery({
    queryKey: ["instantly", "analytics"],
    queryFn: () => callAnalytics(),
    staleTime: 5 * 60_000,
  });

  const connected = q.data?.connected === true;
  const live = q.data && "analytics" in q.data ? q.data.analytics : null;


  const stats = live
    ? [
        {
          icon: Send,
          label: "Emails sent",
          value: live.emailsSent.toLocaleString(),
          sub: `${live.newLeads.toLocaleString()} new leads`,
        },
        {
          icon: MailOpen,
          label: "Open rate",
          value: pct(live.opens, live.emailsSent),
          sub: `${live.opens.toLocaleString()} opens`,
          tone: "good" as const,
        },
        {
          icon: Inbox,
          label: "Reply rate",
          value: pct(live.replies, live.emailsSent),
          sub: `${live.replies.toLocaleString()} replies`,
          tone: "good" as const,
        },
        {
          icon: Flame,
          label: "Opportunities",
          value: live.opportunities.toLocaleString(),
          sub: `${live.bounced.toLocaleString()} bounced`,
          tone: "hot" as const,
        },
      ]
    : [
        { icon: Inbox, label: "Replies", value: "0", sub: "No data yet" },
        { icon: Flame, label: "Hot leads", value: "0", sub: "No data yet", tone: "hot" as const },
        { icon: Sparkles, label: "Meetings booked", value: "0", sub: "No data yet", tone: "good" as const },
        { icon: Clock, label: "Avg response", value: "—", sub: "No data yet", tone: "good" as const },
      ];

  const chartData =
    live && live.daily.length > 0
      ? live.daily.map((d) => ({ day: d.date, replies: d.replied, hot: d.opened }))
      : [];

  const pieData =
    live && live.categoryBreakdown.length > 0 ? live.categoryBreakdown : [];

  return (
    <div className="mx-auto h-[calc(100dvh-3rem)] max-w-6xl overflow-y-auto px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Plug aria-hidden="true" className={cn("h-3 w-3", connected ? "text-emerald-500" : "text-amber-500")} />
            <span aria-label={connected ? "Connected to Instantly" : "Not connected to Instantly"}>
              {connected
                ? "Live from Instantly · all campaigns"
                : q.isLoading
                  ? "Loading analytics…"
                  : "No data yet · connect Instantly to see live campaign stats"}
            </span>
          </p>
        </div>
        {!connected && !q.isLoading && (
          <Link
            to="/app/integrations"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plug className="h-3.5 w-3.5" /> Connect Instantly
          </Link>
        )}
      </div>


      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Stat key={s.label} icon={s.icon} label={s.label} value={s.value} sub={s.sub} tone={s.tone} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">
                {live ? "Last 7 days" : "Reply volume"}
              </div>
              <div className="text-xs text-muted-foreground">
                {live ? "Opens vs replies" : "Replies vs hot leads"}
              </div>
            </div>
            <TrendingUp className="h-4 w-4 text-brand" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
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
              <Bar dataKey={live ? "hot" : "replies"} fill="oklch(0.62 0.22 274)" radius={[6, 6, 0, 0]} name={live ? "Opens" : "Replies"} />
              <Bar dataKey={live ? "replies" : "hot"} fill="hsl(0 70% 55%)" radius={[6, 6, 0, 0]} name={live ? "Replies" : "Hot"} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4">
            <div className="text-sm font-semibold">Lead interest</div>
            <div className="text-xs text-muted-foreground">
              {live ? "Distribution across leads" : "AI classification"}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
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
