import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Filter, Loader2, Plug, Plus, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scoreLead } from "@/lib/ai.functions";
import { listInstantlyLeads, type InstantlyLead } from "@/lib/instantly.functions";
import { listLeadScores, saveLeadScore } from "@/lib/leads.functions";
import { CONTACTS, type Contact } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/crm")({
  component: CrmPage,
});

const STATUS_STYLE: Record<string, string> = {
  new: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  interested: "bg-brand/10 text-brand",
  qualified: "bg-brand/10 text-brand",
  meeting: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  customer: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "not-interested": "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  bounced: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  churned: "bg-muted text-muted-foreground",
};

type Row = {
  key: string;
  name: string;
  email: string;
  company: string;
  title: string;
  status: string;
  lastActivity: string;
  fallbackScore: number;
};

function contactToRow(c: Contact): Row {
  return {
    key: c.email,
    name: c.name,
    email: c.email,
    company: c.company,
    title: c.title,
    status: c.status,
    lastActivity: c.lastActivity,
    fallbackScore: c.score,
  };
}

function leadToRow(l: InstantlyLead): Row {
  return {
    key: l.email,
    name: l.name,
    email: l.email,
    company: l.company,
    title: l.title || "—",
    status: l.status,
    lastActivity: l.lastActivity,
    fallbackScore: 0,
  };
}

function CrmPage() {
  const qc = useQueryClient();
  const callScore = useServerFn(scoreLead);
  const callListLeads = useServerFn(listInstantlyLeads);
  const callListScores = useServerFn(listLeadScores);
  const callSaveScore = useServerFn(saveLeadScore);

  const leadsQuery = useQuery({
    queryKey: ["instantly", "leads"],
    queryFn: () => callListLeads(),
    staleTime: 60_000,
  });
  const scoresQuery = useQuery({
    queryKey: ["lead_scores"],
    queryFn: () => callListScores(),
    staleTime: 30_000,
  });

  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [search, setSearch] = useState("");

  const connected = leadsQuery.data?.connected === true;
  const rows: Row[] = useMemo(() => {
    const live = leadsQuery.data?.leads ?? [];
    if (connected && live.length) return live.map(leadToRow);
    return CONTACTS.map(contactToRow);
  }, [leadsQuery.data, connected]);

  const scoreMap = useMemo(() => {
    const map = new Map<string, { score: number; reason: string }>();
    for (const s of scoresQuery.data?.scores ?? []) {
      map.set(s.lead_key, { score: s.score, reason: s.reason });
    }
    return map;
  }, [scoresQuery.data]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q),
    );
  }, [rows, search]);

  async function scoreOne(row: Row) {
    setBusy(row.key);
    try {
      const res = await callScore({
        data: {
          name: row.name,
          email: row.email,
          company: row.company,
          title: row.title,
          status: row.status,
          lastActivity: row.lastActivity,
        },
      });
      try {
        await callSaveScore({
          data: { leadKey: row.key, score: res.score, reason: res.reason },
        });
        qc.invalidateQueries({ queryKey: ["lead_scores"] });
      } catch (e) {
        // score generated but couldn't persist — still show in UI via cache set
        toast.error(
          `Scored ${row.name} but couldn't save: ${e instanceof Error ? e.message : "unknown"}`,
        );
        qc.setQueryData(["lead_scores"], (prev: { scores?: Array<{ lead_key: string; score: number; reason: string }> } | undefined) => {
          const scores = prev?.scores ?? [];
          const other = scores.filter((s) => s.lead_key !== row.key);
          return { scores: [...other, { lead_key: row.key, score: res.score, reason: res.reason }] };
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI scoring failed");
    } finally {
      setBusy(null);
    }
  }

  async function scoreAll() {
    setBulkBusy(true);
    try {
      for (const r of filtered) {
        // eslint-disable-next-line no-await-in-loop
        await scoreOne(r);
      }
      toast.success("All contacts re-scored");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Plug
              aria-hidden="true"
              className={cn("h-3 w-3", connected ? "text-emerald-500" : "text-amber-500")}
            />
            <span aria-label={connected ? "Connected to Instantly" : "Not connected to Instantly"}>
              {connected
                ? `${rows.length} live leads from Instantly · AI scores saved to your workspace`
                : leadsQuery.isLoading
                  ? "Loading leads…"
                  : "Demo contacts — connect Instantly to see real leads"}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts…"
              className="h-9 w-64 pl-8"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-3.5 w-3.5" /> Filter
          </Button>
          <Button variant="outline" size="sm" onClick={scoreAll} disabled={bulkBusy}>
            {bulkBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI qualify all
          </Button>
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" /> Add contact
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background/95 backdrop-blur">
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3 font-semibold">Contact</th>
              <th className="px-6 py-3 font-semibold">Company</th>
              <th className="px-6 py-3 font-semibold">Title</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">AI score</th>
              <th className="px-6 py-3 font-semibold">Last activity</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const persisted = scoreMap.get(row.key);
              const score = persisted?.score ?? row.fallbackScore;
              const hasScore = Boolean(persisted);
              return (
                <tr
                  key={row.key}
                  className="border-b border-border/40 transition hover:bg-accent/40"
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                        {row.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div>
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground">{row.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">{row.company}</td>
                  <td className="px-6 py-3 text-muted-foreground">{row.title}</td>
                  <td className="px-6 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                        STATUS_STYLE[row.status] ?? STATUS_STYLE.new,
                      )}
                    >
                      {row.status.replace("-", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            score >= 85
                              ? "bg-emerald-500"
                              : score >= 70
                                ? "bg-brand"
                                : score > 0
                                  ? "bg-amber-500"
                                  : "bg-muted-foreground/30",
                          )}
                          style={{ width: `${Math.max(score, 4)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium tabular-nums">
                        {score || "—"}
                      </span>
                      {hasScore && (
                        <span
                          title={persisted?.reason}
                          className="ml-1 inline-flex items-center gap-1 rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand"
                        >
                          <Sparkles className="h-2.5 w-2.5" /> AI
                        </span>
                      )}
                    </div>
                    {persisted?.reason && (
                      <div className="mt-1 max-w-[280px] truncate text-[11px] text-muted-foreground">
                        {persisted.reason}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3 text-xs text-muted-foreground">
                    {row.lastActivity}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy === row.key}
                      onClick={() => scoreOne(row)}
                    >
                      {busy === row.key ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Qualify
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  {search ? (
                    <div className="flex flex-col items-center gap-2">
                      <span>No contacts match "{search}".</span>
                      <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                        Clear search
                      </Button>
                    </div>
                  ) : (
                    "No contacts yet. Connect a mailbox to start syncing leads."
                  )}
                </td>
              </tr>
            )}

          </tbody>
        </table>
      </div>
    </div>
  );
}
