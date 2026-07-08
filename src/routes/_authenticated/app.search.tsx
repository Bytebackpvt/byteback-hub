import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { universalSearch } from "@/lib/search.functions";

export const Route = createFileRoute("/_authenticated/app/search")({
  head: () => ({
    meta: [
      { title: "Search — ByteBack" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const call = useServerFn(universalSearch);
  const query = useQuery({
    queryKey: ["universalSearch", "page", submitted],
    queryFn: () => call({ data: { q: submitted, semantic: true } }),
    enabled: submitted.trim().length >= 2,
    staleTime: 30_000,
  });

  const hits = query.data?.hits ?? [];
  const items = hits.filter((h) => h.type !== "memory");
  const memory = hits.filter((h) => h.type === "memory");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Search className="h-5 w-5" /> Universal search
        </h1>
        <p className="text-sm text-muted-foreground">
          Search across tasks, notifications, and AI-remembered emails. Press ⌘K anywhere.
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
        <div className="space-y-6">
          {items.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Results
              </h2>
              <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
                {items.map((h) => (
                  <li key={`${h.type}-${h.id}`}>
                    <Link
                      to={h.link as "/app/tasks"}
                      className="flex items-start gap-3 p-3 hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{h.title}</div>
                        {h.snippet && (
                          <div className="line-clamp-1 text-xs text-muted-foreground">
                            {h.snippet}
                          </div>
                        )}
                      </div>
                      {h.meta && (
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {h.meta}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {memory.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-brand">
                <Sparkles className="h-3 w-3" /> AI memory matches
              </h2>
              <ul className="divide-y divide-border/50 rounded-xl border border-brand/40 bg-brand/5">
                {memory.map((h) => (
                  <li key={`memory-${h.id}`} className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-sm font-medium">{h.title}</div>
                      {h.meta && <span className="text-[10px] text-brand">{h.meta}</span>}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {h.snippet}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
