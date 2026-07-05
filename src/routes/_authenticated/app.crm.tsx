import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Filter, Loader2, Plus, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scoreLead } from "@/lib/ai.functions";
import { CONTACTS, type Contact } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/crm")({
  component: CrmPage,
});

const STATUS: Record<string, string> = {
  new: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  qualified: "bg-brand/10 text-brand",
  customer: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  churned: "bg-muted text-muted-foreground",
};

type Scored = { score: number; reason: string };

function CrmPage() {
  const callScore = useServerFn(scoreLead);
  const [scores, setScores] = useState<Record<string, Scored>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function scoreOne(c: Contact) {
    setBusy(c.id);
    try {
      const res = await callScore({
        data: {
          name: c.name,
          email: c.email,
          company: c.company,
          title: c.title,
          status: c.status,
          lastActivity: c.lastActivity,
        },
      });
      setScores((s) => ({ ...s, [c.id]: res }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI scoring failed");
    } finally {
      setBusy(null);
    }
  }

  async function scoreAll() {
    setBulkBusy(true);
    try {
      for (const c of CONTACTS) {
        // sequential to avoid rate limits
        // eslint-disable-next-line no-await-in-loop
        await scoreOne(c);
      }
      toast.success("All contacts re-scored");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-xs text-muted-foreground">
            Everyone who replied across your mailboxes, auto-enriched.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search contacts…" className="h-9 w-64 pl-8" />
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
            {CONTACTS.map((c) => {
              const scored = scores[c.id];
              const score = scored?.score ?? c.score;
              return (
                <tr
                  key={c.id}
                  className="border-b border-border/40 transition hover:bg-accent/40"
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                        {c.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">{c.company}</td>
                  <td className="px-6 py-3 text-muted-foreground">{c.title}</td>
                  <td className="px-6 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                        STATUS[c.status],
                      )}
                    >
                      {c.status}
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
                                : "bg-amber-500",
                          )}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium tabular-nums">{score}</span>
                      {scored && (
                        <span
                          title={scored.reason}
                          className="ml-1 inline-flex items-center gap-1 rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand"
                        >
                          <Sparkles className="h-2.5 w-2.5" /> AI
                        </span>
                      )}
                    </div>
                    {scored?.reason && (
                      <div className="mt-1 max-w-[280px] truncate text-[11px] text-muted-foreground">
                        {scored.reason}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3 text-xs text-muted-foreground">
                    {c.lastActivity}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy === c.id}
                      onClick={() => scoreOne(c)}
                    >
                      {busy === c.id ? (
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
