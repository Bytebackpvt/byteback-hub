import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  Bookmark,
  Loader2,
  Play,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  universalSearch,
  type SearchFilters,
  type SearchHitType,
} from "@/lib/search.functions";
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  runSavedSearchAlert,
  toggleSavedSearchAlert,
} from "@/lib/saved-search.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/search")({
  head: () => ({
    meta: [
      { title: "Search — ByteBack" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SearchPage,
});

const TYPE_OPTS: { key: SearchHitType; label: string }[] = [
  { key: "task", label: "Tasks" },
  { key: "notification", label: "Notifications" },
  { key: "memory", label: "AI memory" },
];

const TIME_OPTS: { label: string; hours: number | undefined }[] = [
  { label: "Any time", hours: undefined },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
  { label: "30d", hours: 720 },
];

const PRIORITY_PRESETS: { label: string; key: string; weights: Partial<Record<SearchHitType, number>> }[] = [
  { label: "Balanced", key: "balanced", weights: { task: 1, notification: 1, memory: 1 } },
  { label: "Prioritize leads", key: "leads", weights: { notification: 2, memory: 1.5, task: 0.7 } },
  { label: "Prioritize threads", key: "threads", weights: { memory: 2, notification: 1.2, task: 0.5 } },
  { label: "Prioritize tasks", key: "tasks", weights: { task: 2, notification: 0.8, memory: 0.5 } },
];

function SearchPage() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [types, setTypes] = useState<Set<SearchHitType>>(
    new Set(["task", "notification", "memory"]),
  );
  const [sinceHours, setSinceHours] = useState<number | undefined>(undefined);
  const [priorityKey, setPriorityKey] = useState<string>("balanced");
  const [saveName, setSaveName] = useState("");
  const [alertOn, setAlertOn] = useState(false);

  const qc = useQueryClient();
  const callSearch = useServerFn(universalSearch);
  const callList = useServerFn(listSavedSearches);
  const callCreate = useServerFn(createSavedSearch);
  const callDelete = useServerFn(deleteSavedSearch);
  const callToggle = useServerFn(toggleSavedSearchAlert);
  const callRun = useServerFn(runSavedSearchAlert);

  const filters: SearchFilters = useMemo(() => {
    const preset = PRIORITY_PRESETS.find((p) => p.key === priorityKey);
    return {
      types: Array.from(types),
      since: sinceHours ? new Date(Date.now() - sinceHours * 3600 * 1000).toISOString() : null,
      priority: preset?.weights,
    };
  }, [types, sinceHours, priorityKey]);

  const query = useQuery({
    queryKey: ["universalSearch", "page", submitted, filters],
    queryFn: () =>
      callSearch({ data: { q: submitted, semantic: true, filters } }),
    enabled: submitted.trim().length >= 2,
    staleTime: 30_000,
  });

  const savedQ = useQuery({
    queryKey: ["savedSearches"],
    queryFn: () => callList(),
    staleTime: 60_000,
  });

  const createMut = useMutation({
    mutationFn: () =>
      callCreate({
        data: {
          name: saveName.trim() || submitted.slice(0, 40),
          query: submitted,
          filters,
          alert_enabled: alertOn,
        },
      }),
    onSuccess: () => {
      toast.success("Saved search");
      setSaveName("");
      setAlertOn(false);
      qc.invalidateQueries({ queryKey: ["savedSearches"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const runMut = useMutation({
    mutationFn: (id: string) => callRun({ data: { id } }),
    onSuccess: (r) => {
      toast.success(r.newCount > 0 ? `${r.newCount} new match(es) — check notifications` : "No new matches");
      qc.invalidateQueries({ queryKey: ["savedSearches"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const hits = query.data?.hits ?? [];

  function toggleType(t: SearchHitType) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      if (next.size === 0) next.add(t); // never empty
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Search className="h-5 w-5" /> Universal search
        </h1>
        <p className="text-sm text-muted-foreground">
          Search across tasks, notifications, and AI-remembered emails. Save searches to get alerts when new matches appear.
        </p>
      </header>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q);
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Try: "pricing", "demo request", "GreenSpark"'
          autoFocus
        />
        <Button type="submit" disabled={q.trim().length < 2}>
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-3">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Show
        </span>
        {TYPE_OPTS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={types.has(t.key) ? "default" : "outline"}
            className="h-7 px-2 text-xs"
            onClick={() => toggleType(t.key)}
          >
            {t.label}
          </Button>
        ))}
        <span className="mx-2 h-4 w-px bg-border" />
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recency
        </span>
        {TIME_OPTS.map((r) => (
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
          Relevance
        </span>
        {PRIORITY_PRESETS.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={priorityKey === p.key ? "default" : "outline"}
            className="h-7 px-2 text-xs"
            onClick={() => setPriorityKey(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {submitted.trim().length >= 2 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3">
          <Bookmark className="h-4 w-4 text-brand" />
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder={`Name (default: "${submitted.slice(0, 40)}")`}
            className="h-8 max-w-xs text-xs"
          />
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={alertOn}
              onChange={(e) => setAlertOn(e.target.checked)}
            />
            Alert on new matches
          </label>
          <Button
            size="sm"
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
            className="h-8"
          >
            {createMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save search"}
          </Button>
        </div>
      )}

      {submitted.trim().length < 2 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Type something to search — semantic AI memory kicks in for 3+ characters.
        </div>
      ) : query.isLoading || query.isFetching ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching…
        </div>
      ) : hits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          No results for “{submitted}”.
        </div>
      ) : (
        <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
          {hits.map((h) => (
            <li key={`${h.type}-${h.id}`}>
              <Link
                to={h.link as "/app/tasks"}
                className="flex items-start gap-3 p-3 hover:bg-muted/40"
              >
                {h.type === "memory" ? (
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                ) : (
                  <Search className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{h.title}</div>
                  {h.snippet && (
                    <div className="line-clamp-1 text-xs text-muted-foreground">
                      {h.snippet}
                    </div>
                  )}
                  <div className="mt-1 text-[10px] italic text-muted-foreground">
                    Why: {h.reason} · score {h.score.toFixed(2)}
                  </div>
                </div>
                {h.meta && (
                  <span
                    className={cn(
                      "shrink-0 text-[10px] uppercase tracking-wide",
                      h.type === "memory" ? "text-brand" : "text-muted-foreground",
                    )}
                  >
                    {h.meta}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Bookmark className="h-4 w-4" /> Saved searches
        </h2>
        {savedQ.isLoading ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : (savedQ.data?.searches ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
            No saved searches yet. Run a search above and click "Save search".
          </div>
        ) : (
          <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
            {savedQ.data!.searches.map((s) => (
              <li key={s.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{s.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    “{s.query}”
                    {s.last_checked_at
                      ? ` · last checked ${new Date(s.last_checked_at).toLocaleString()}`
                      : " · never checked"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() =>
                    callToggle({
                      data: { id: s.id, alert_enabled: !s.alert_enabled },
                    }).then(() => qc.invalidateQueries({ queryKey: ["savedSearches"] }))
                  }
                  title={s.alert_enabled ? "Disable alerts" : "Enable alerts"}
                >
                  {s.alert_enabled ? (
                    <Bell className="h-3.5 w-3.5 text-brand" />
                  ) : (
                    <BellOff className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => runMut.mutate(s.id)}
                  disabled={runMut.isPending}
                  title="Run alert check now"
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-rose-500 hover:text-rose-600"
                  onClick={() =>
                    callDelete({ data: { id: s.id } }).then(() =>
                      qc.invalidateQueries({ queryKey: ["savedSearches"] }),
                    )
                  }
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
