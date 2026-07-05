import { createFileRoute } from "@tanstack/react-router";
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
import { Clock, Flame, Inbox, Sparkles, TrendingUp } from "lucide-react";

import { ANALYTICS } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/app/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <div className="mx-auto h-[calc(100vh-3rem)] max-w-6xl overflow-y-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-xs text-muted-foreground">Last 7 days across every mailbox.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Inbox} label="Replies" value={ANALYTICS.totalReplies.toString()} delta="+12%" />
        <Stat icon={Flame} label="Hot leads" value={ANALYTICS.hotLeads.toString()} delta="+8%" tone="hot" />
        <Stat icon={Sparkles} label="Meetings booked" value={ANALYTICS.meetingsBooked.toString()} delta="+22%" tone="good" />
        <Stat icon={Clock} label="Avg response" value={ANALYTICS.avgResponseTime} delta="-14%" tone="good" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Reply volume</div>
              <div className="text-xs text-muted-foreground">Replies vs hot leads</div>
            </div>
            <TrendingUp className="h-4 w-4 text-brand" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ANALYTICS.weekly}>
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
              <Bar dataKey="replies" fill="oklch(0.62 0.22 274)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="hot" fill="hsl(0 70% 55%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4">
            <div className="text-sm font-semibold">Reply categories</div>
            <div className="text-xs text-muted-foreground">AI classification</div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={ANALYTICS.categoryBreakdown}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {ANALYTICS.categoryBreakdown.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: 11 }}
              />
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
  delta,
  tone,
}: {
  icon: typeof Inbox;
  label: string;
  value: string;
  delta: string;
  tone?: "good" | "hot";
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon
          className={
            tone === "hot" ? "h-4 w-4 text-rose-500" : tone === "good" ? "h-4 w-4 text-emerald-500" : "h-4 w-4 text-brand"
          }
        />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        <span className={delta.startsWith("-") && tone === "good" ? "text-emerald-500" : "text-emerald-500"}>
          {delta}
        </span>{" "}
        vs last week
      </div>
    </div>
  );
}
