import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlarmClock,
  Calendar,
  ChevronRight,
  Flame,
  Loader2,
  Package,
  RadarIcon,
  RefreshCcw,
  Sun,
  Video,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRadarSummary, type RadarBucket, type RadarBucketKey } from "@/lib/radar.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/radar")({
  head: () => ({
    meta: [
      { title: "Opportunity Radar — ByteBack" },
      { name: "description", content: "AI-ranked open opportunities across your inbox." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RadarPage,
});

const ICONS = {
  flame: Flame,
  video: Video,
  wallet: Wallet,
  calendar: Calendar,
  sun: Sun,
  package: Package,
  alarm: AlarmClock,
  x: X,
} as const;


const TONE_CLASS: Record<RadarBucket["tone"], string> = {
  hot: "border-rose-500/40 bg-rose-500/5",
  warm: "border-amber-500/40 bg-amber-500/5",
  cool: "border-sky-500/40 bg-sky-500/5",
  neutral: "border-border/60 bg-card",
};

const TIME_RANGES: { label: string; hours: number | undefined }[] = [
  { label: "All", hours: undefined },
  { label: "24h", hours: 24 },
  { label: "3d", hours: 72 },
  { label: "7d", hours: 168 },
  { label: "30d", hours: 720 },
];

const BUCKET_FILTERS: { key: RadarBucketKey; label: string }[] = [
  { key: "hot_unreplied", label: "Hot" },
  { key: "demo_requests", label: "Demos" },
  { key: "pricing_requests", label: "Pricing" },
  { key: "meetings_to_schedule", label: "Meetings" },
  { key: "warm", label: "Warm" },
  { key: "pickup", label: "Pickup" },
  { key: "followups_overdue", label: "Overdue" },
  { key: "lost", label: "Lost" },
];

function RadarPage() {
  const [sinceHours, setSinceHours] = useState<number | undefined>(undefined);
  const [selected, setSelected] = useState<Set<RadarBucketKey>>(new Set());
  const call = useServerFn(getRadarSummary);
  const q = useQuery({
    queryKey: ["radar", "summary", sinceHours, Array.from(selected).sort().join(",")],
    queryFn: () =>
      call({
        data: {
          sinceHours,
          buckets: selected.size ? Array.from(selected) : undefined,
        },
      }),
    staleTime: 60_000,
  });

  const s = q.data?.summary;

  function toggle(key: RadarBucketKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <RadarIcon className="h-5 w-5 text-brand" /> Opportunity Radar
          </h1>
          <p className="text-sm text-muted-foreground">
            Open opportunities across every mailbox, ranked by potential value.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
          {q.isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCcw className="h-3.5 w-3.5" />
          )}{" "}
          Rescan
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-3">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recency
        </span>
        {TIME_RANGES.map((r) => (
          <Button
            key={r.label}
            size="sm"
            variant={sinceHours === r.hours ? "default" : "outline"}
            className="h-7 px-2 text-xs"
            onClick={() => setSinceHours(r.hours)}
          >
            {r.label}
          </Button>
        ))}
        <span className="mx-2 h-4 w-px bg-border" />
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sources
        </span>
        {BUCKET_FILTERS.map((b) => (
          <Button
            key={b.key}
            size="sm"
            variant={selected.has(b.key) ? "default" : "outline"}
            className="h-7 px-2 text-xs"
            onClick={() => toggle(b.key)}
          >
            {b.label}
          </Button>
        ))}
        {selected.size > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        )}
      </div>

      <section className="rounded-2xl border border-brand/40 bg-gradient-to-br from-brand/15 via-brand/5 to-transparent p-6">
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Scanning…
          </div>
        ) : q.error ? (
          <p className="text-sm text-rose-500">
            {q.error instanceof Error ? q.error.message : "Radar failed"}
          </p>
        ) : (
          <>
            <div className="text-xs font-semibold uppercase tracking-wider text-brand">Today</div>
            <p className="mt-1 text-lg font-medium leading-snug">{s?.headline}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>
                Hot unreplied:{" "}
                <span className="font-semibold text-foreground">{s?.hotUnreplied ?? 0}</span>
              </span>
              <span>
                Categories:{" "}
                <span className="font-semibold text-foreground">{s?.buckets.length ?? 0}</span>
              </span>
            </div>
          </>
        )}
      </section>

      {!q.isLoading && (s?.buckets.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No open opportunities in this range. Widen the filters or connect a mailbox.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/app/integrations">Connect an inbox</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {s?.buckets.map((b) => {
            const Icon = ICONS[b.icon as keyof typeof ICONS] ?? Flame;
            return (
              <section
                key={b.key}
                className={cn("rounded-2xl border p-4", TONE_CLASS[b.tone])}
              >
                <header className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <h2 className="text-sm font-semibold">{b.label}</h2>
                    <span className="rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-semibold">
                      {b.items.length}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{inr(b.totalValue)}</span>
                </header>
                <ul className="space-y-2">
                  {b.items.slice(0, 6).map((i) => {
                    const goesToInbox =
                      !!i.thread_key || (i.link ?? "").startsWith("/app/inbox");
                    const linkProps = goesToInbox
                      ? ({
                          to: "/app/inbox",
                          search: i.thread_key ? { thread: i.thread_key } : undefined,
                        } as const)
                      : ({ to: (i.link ?? "/app/notifications") as "/app/notifications" } as const);
                    return (
                      <li key={i.id}>
                        <Link
                          {...linkProps}
                          className="flex items-start gap-2 rounded-lg p-2 -mx-2 hover:bg-background/60"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{i.title}</div>
                            {i.subtitle && (
                              <div className="line-clamp-1 text-xs text-muted-foreground">
                                {i.subtitle}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-[11px] font-semibold text-foreground">
                              {inr(i.value)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">waited {i.waited}</div>
                          </div>
                          <ChevronRight className="mt-1 h-3.5 w-3.5 text-muted-foreground" />
                        </Link>
                      </li>
                    );
                  })}
                  {b.items.length > 6 && (
                    <li className="pt-1 text-center text-[11px] text-muted-foreground">
                      +{b.items.length - 6} more
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
