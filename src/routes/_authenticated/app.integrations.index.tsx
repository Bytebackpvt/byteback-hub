import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  Users2,
  MessagesSquare,
  CalendarDays,
  HardDrive,
  Sparkles,
  Zap,
  Search,
  Plus,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listCatalog,
  requestIntegration,
  cancelIntegrationRequest,
  type CatalogEntry,
} from "@/lib/marketplace.functions";
import { listConnectedAccounts } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/_authenticated/app/integrations/")({
  head: () => ({ meta: [{ title: "Integration Marketplace — ByteBack" }, { name: "robots", content: "noindex" }] }),
  component: MarketplacePage,
});

const CATEGORIES: { id: string; label: string; icon: typeof Mail }[] = [
  { id: "all", label: "All", icon: BadgeCheck },
  { id: "email", label: "Email", icon: Mail },
  { id: "cold_email", label: "Cold Email", icon: Send },
  { id: "crm", label: "CRM", icon: Users2 },
  { id: "chat", label: "Team Chat", icon: MessagesSquare },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "automation", label: "Automation", icon: Zap },
];

function MarketplacePage() {
  const callList = useServerFn(listCatalog);
  const callConnected = useServerFn(listConnectedAccounts);
  const q = useQuery({
    queryKey: ["marketplace", "catalog"],
    queryFn: () => callList(),
    staleTime: 60_000,
  });
  const connectedQ = useQuery({
    queryKey: ["marketplace", "connected"],
    queryFn: () => callConnected(),
    staleTime: 30_000,
  });

  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [search, setSearch] = useState("");

  const catalog = q.data?.catalog ?? [];
  const requested = new Set(q.data?.requested ?? []);
  const connectedProviders = useMemo(() => {
    const set = new Set<string>();
    for (const a of connectedQ.data?.accounts ?? []) set.add(a.provider);
    for (const a of connectedQ.data?.oauth ?? []) set.add(a.provider);
    // Map webhook provider slugs to catalog ids
    const webhookMap: Record<string, string> = {
      slack_webhook: "slack",
      teams_webhook: "microsoft_teams",
      discord_webhook: "discord",
      zapier_webhook: "zapier",
    };
    const mapped = new Set<string>();
    set.forEach((p) => mapped.add(webhookMap[p] ?? p));
    return mapped;
  }, [connectedQ.data]);

  const filtered = catalog.filter((c) => {
    if (selectedCat !== "all" && c.category !== selectedCat) return false;
    if (search && !`${c.name} ${c.tagline}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = useMemo(() => {
    if (selectedCat !== "all") return { [selectedCat]: filtered };
    const g: Record<string, CatalogEntry[]> = {};
    for (const c of filtered) (g[c.category] ??= []).push(c);
    return g;
  }, [filtered, selectedCat]);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 50+ apps…"
            className="pl-8"
          />
        </div>
        <nav aria-label="Categories" className="space-y-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors " +
                (selectedCat === cat.id
                  ? "bg-brand/10 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")
              }
            >
              <cat.icon className="h-4 w-4" />
              <span className="flex-1">{cat.label}</span>
              {cat.id !== "all" && (
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {catalog.filter((c) => c.category === cat.id).length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <section className="space-y-8">
        {q.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
          </div>
        )}
        {!q.isLoading && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
            No integrations match your search.
          </div>
        )}
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="space-y-3">
            {selectedCat === "all" && (
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORIES.find((c) => c.id === cat)?.label ?? cat}
              </h2>
            )}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((entry) => (
                <ProviderCard
                  key={entry.id}
                  entry={entry}
                  connected={connectedProviders.has(entry.id)}
                  requested={requested.has(entry.id)}
                />
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
  connected,
  requested,
}: {
  entry: CatalogEntry;
  connected: boolean;
  requested: boolean;
}) {
  const qc = useQueryClient();
  const callRequest = useServerFn(requestIntegration);
  const callCancel = useServerFn(cancelIntegrationRequest);

  const reqMut = useMutation({
    mutationFn: () => callRequest({ data: { provider_id: entry.id } }),
    onSuccess: () => {
      toast.success(`Added ${entry.name} to your waitlist`, {
        description: "We'll email you when it's live.",
      });
      qc.invalidateQueries({ queryKey: ["marketplace", "catalog"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const cancelMut = useMutation({
    mutationFn: () => callCancel({ data: { provider_id: entry.id } }),
    onSuccess: () => {
      toast.success(`Removed from waitlist`);
      qc.invalidateQueries({ queryKey: ["marketplace", "catalog"] });
    },
  });

  const isLive = entry.status === "live";
  const isBeta = entry.status === "beta";

  return (
    <div className="group flex h-full flex-col rounded-xl border border-border/70 bg-card p-4 transition-all hover:border-brand/40 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <ProviderLogo slug={entry.logo_slug} name={entry.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-medium">{entry.name}</h3>
            {isBeta && <Badge variant="outline" className="h-4 px-1 text-[9px]">Beta</Badge>}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{entry.tagline}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        {connected ? (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Connected
          </Badge>
        ) : isLive || isBeta ? (
          <span className="text-[11px] text-muted-foreground">
            {entry.auth_type === "oauth"
              ? "1-click OAuth"
              : entry.auth_type === "webhook"
              ? "Webhook setup"
              : "API key"}
          </span>
        ) : requested ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" /> On waitlist
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">Coming soon</span>
        )}
        {connected ? (
          <Button asChild size="sm" variant="ghost">
            <Link to="/app/integrations/connected">Manage</Link>
          </Button>
        ) : isLive || isBeta ? (
          <Button asChild size="sm">
            <Link to="/app/integrations/$providerId" params={{ providerId: entry.id }}>
              Connect
            </Link>
          </Button>
        ) : requested ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => cancelMut.mutate()}
            disabled={cancelMut.isPending}
          >
            Remove
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => reqMut.mutate()}
            disabled={reqMut.isPending}
          >
            {reqMut.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Request
          </Button>
        )}
      </div>
    </div>
  );
}

function ProviderLogo({ slug, name }: { slug: string | null; name: string }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  if (slug) {
    // Use simpleicons CDN for known brand slugs; graceful fallback via onError
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
            (e.currentTarget.parentElement as HTMLElement).classList.add("text-xs", "font-semibold", "text-muted-foreground");
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
