import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  listCustomerLeads,
  updateCustomerLead,
  type CustomerLead,
} from "@/lib/customer-leads.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Flame, Snowflake, ThermometerSun, MoreHorizontal, Clock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/leads")({
  head: () => ({
    meta: [
      { title: "Leads — ByteBack" },
      { name: "description", content: "Every customer conversation grouped as one Lead so nothing slips through." },
    ],
  }),
  component: LeadsPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm text-muted-foreground">Not found.</div>,
});

type Filter = "needs_attention" | "open" | "snoozed" | "closed" | "all";

function TempPill({ t }: { t: string | null }) {
  if (!t) return null;
  const v = t.toLowerCase();
  const style =
    v === "hot"
      ? "bg-red-500/15 text-red-600"
      : v === "warm"
      ? "bg-amber-500/15 text-amber-600"
      : v === "cold"
      ? "bg-sky-500/15 text-sky-600"
      : "bg-muted text-muted-foreground";
  const Icon = v === "hot" ? Flame : v === "cold" ? Snowflake : ThermometerSun;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${style}`}>
      <Icon className="h-3 w-3" />
      {t}
    </span>
  );
}

function fmtHours(h: number | null): string {
  if (h == null) return "";
  if (h < 1) return "<1h";
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function LeadsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("needs_attention");
  const call = useServerFn(listCustomerLeads);
  const q = useQuery({
    queryKey: ["customer-leads", filter],
    queryFn: () => call({ data: { filter, limit: 200 } }),
    staleTime: 30_000,
  });

  const updateFn = useServerFn(updateCustomerLead);
  type UpdatePatch = {
    status?: "open" | "snoozed" | "won" | "lost" | "dead";
    temperature?: string | null;
    stage?: string | null;
    snoozedUntil?: string | null;
  };
  const doUpdate = async (leadId: string, patch: UpdatePatch) => {
    try {
      await updateFn({ data: { ...patch, leadId } });
      toast.success("Updated");
      router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const leads = q.data?.leads ?? [];

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">
            One row per customer — every mailbox that talked to them is grouped here.
          </p>
        </div>
      </header>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="needs_attention">Needs attention</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="snoozed">Snoozed</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1 overflow-auto rounded-lg border border-border/60">
        {q.isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {filter === "needs_attention" ? "Inbox zero — no lead is waiting on you." : "No leads here."}
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {leads.map((l) => (
              <LeadRow key={l.id} lead={l} onUpdate={doUpdate} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LeadRow({
  lead,
  onUpdate,
}: {
  lead: CustomerLead;
  onUpdate: (id: string, patch: { status?: "open" | "snoozed" | "won" | "lost" | "dead"; temperature?: string | null; snoozedUntil?: string | null }) => void;
}) {
  return (
    <li className="group flex items-center gap-3 px-4 py-3 hover:bg-accent/40">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{lead.customerName || lead.customerEmail}</span>
          <TempPill t={lead.temperature} />
          {lead.stage && (
            <Badge variant="outline" className="text-[10px]">
              {lead.stage}
            </Badge>
          )}
          {lead.status !== "open" && (
            <Badge variant="secondary" className="text-[10px] capitalize">
              {lead.status}
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="truncate">{lead.customerEmail}</span>
          <span>·</span>
          <span>{lead.threadCount} threads</span>
          {lead.ownerMailbox && (
            <>
              <span>·</span>
              <span className="truncate">via {lead.ownerMailbox}</span>
            </>
          )}
        </div>
      </div>

      {lead.needsAttention && (
        <div className="hidden items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600 sm:flex">
          <Clock className="h-3 w-3" />
          waiting {fmtHours(lead.waitingHours)}
        </div>
      )}

      <Button asChild size="sm" variant="ghost">
        <Link to="/app/inbox" search={{ leadId: lead.id } as never}>
          Open <ArrowRight className="ml-1 h-3 w-3" />
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => onUpdate(lead.id, { snoozedUntil: new Date(Date.now() + 24 * 3600 * 1000).toISOString() })}
          >
            Snooze 1 day
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUpdate(lead.id, { snoozedUntil: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() })}
          >
            Snooze 1 week
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onUpdate(lead.id, { temperature: "hot" })}>Mark Hot</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onUpdate(lead.id, { temperature: "warm" })}>Mark Warm</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onUpdate(lead.id, { temperature: "cold" })}>Mark Cold</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onUpdate(lead.id, { status: "won" })}>Mark Won</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onUpdate(lead.id, { status: "lost" })}>Mark Lost</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onUpdate(lead.id, { status: "dead" })}>Mark Dead</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
