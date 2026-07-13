import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Search, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listAllIntegrations } from "@/lib/integrations/universal.functions";
import type { ProviderEntry } from "@/lib/integrations/registry";

export const Route = createFileRoute("/_authenticated/app/integrations/")({
  head: () => ({
    meta: [{ title: "Integrations — ByteBack" }, { name: "robots", content: "noindex" }],
  }),
  component: MarketplacePage,
});

const CATEGORIES: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "email", label: "Email" },
  { id: "cold_email", label: "Cold Email" },
  { id: "crm", label: "CRM" },
  { id: "chat", label: "Chat" },
  { id: "sheets", label: "Sheets" },
  { id: "automation", label: "Automation" },
  { id: "storage", label: "Storage" },
];

function MarketplacePage() {
  const call = useServerFn(listAllIntegrations);
  const q = useQuery({
    queryKey: ["integrations", "all"],
    queryFn: () => call(),
    staleTime: 30_000,
  });

  const [cat, setCat] = useState("all");
  const [search, setSearch] = useState("");

  const rowsByProvider = useMemo(() => {
    type Row = NonNullable<typeof q.data>["rows"][number];
    const m = new Map<string, Row>();
    for (const r of q.data?.rows ?? []) m.set(r.provider_id, r);
    return m;
  }, [q.data]);

  const registry = q.data?.registry ?? [];
  const filtered = registry.filter((p) => {
    if (cat !== "all" && p.category !== cat) return false;
    if (search && !`${p.name} ${p.tagline}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = useMemo(() => {
    if (cat !== "all") return { [cat]: filtered };
    const g: Record<string, ProviderEntry[]> = {};
    for (const p of filtered) (g[p.category] ??= []).push(p);
    return g;
  }, [filtered, cat]);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search integrations…"
            className="pl-8"
          />
        </div>
        <nav aria-label="Categories" className="space-y-0.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors " +
                (cat === c.id
                  ? "bg-brand/10 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")
              }
            >
              <span className="flex-1">{c.label}</span>
              {c.id !== "all" && (
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {registry.filter((p) => p.category === c.id).length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <section className="space-y-8">
        {q.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {!q.isLoading && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
            No integrations match your search.
          </div>
        )}
        {Object.entries(grouped).map(([c, items]) => (
          <div key={c} className="space-y-3">
            {cat === "all" && (
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORIES.find((x) => x.id === c)?.label ?? c}
              </h2>
            )}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((p) => (
                <ProviderCard key={p.id} entry={p} row={rowsByProvider.get(p.id)} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function ProviderCard({
  entry,
  row,
}: {
  entry: ProviderEntry;
  row?: { status: string; health: string; label: string | null } | null;
}) {
  const connected = !!row && row.status !== "not_connected";
  const err = connected && (row!.health === "error" || row!.health === "degraded");
  const isLive = entry.status === "live" || entry.status === "beta";

  return (
    <div className="group flex h-full flex-col rounded-xl border border-border/70 bg-card p-4 transition-all hover:border-brand/40 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <ProviderLogo slug={entry.logo_slug} name={entry.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-medium">{entry.name}</h3>
            {entry.status === "beta" && <Badge variant="outline" className="h-4 px-1 text-[9px]">Beta</Badge>}
            {entry.status === "coming_soon" && (
              <Badge variant="outline" className="h-4 px-1 text-[9px]">Soon</Badge>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{entry.tagline}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        {connected ? (
          err ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Attention
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Connected
            </Badge>
          )
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {entry.auth_kind === "oauth"
              ? "1-click OAuth"
              : entry.auth_kind === "webhook_out"
                ? "Webhook"
                : entry.auth_kind === "webhook_in"
                  ? "Inbound URL"
                  : "API key"}
          </span>
        )}
        {isLive ? (
          <Button asChild size="sm" variant={connected ? "outline" : "default"}>
            <Link to="/app/integrations/$providerId" params={{ providerId: entry.id }}>
              {connected ? "Manage" : "Connect"}
            </Link>
          </Button>
        ) : (
          <span className="text-[11px] text-muted-foreground">Coming soon</span>
        )}
      </div>
    </div>
  );
}

function ProviderLogo({ slug, name }: { slug: string | null; name: string }) {
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (slug) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        <img
          src={`https://cdn.simpleicons.org/${slug}`}
          alt=""
          className="h-6 w-6"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
            (e.currentTarget.parentElement as HTMLElement).textContent = initials;
            (e.currentTarget.parentElement as HTMLElement).classList.add(
              "text-xs", "font-semibold", "text-muted-foreground",
            );
          }}
        />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
      {initials}
    </div>
  );
}
