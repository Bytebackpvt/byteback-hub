import { createFileRoute } from "@tanstack/react-router";
import { Filter, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONTACTS } from "@/lib/mock-data";
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

function CrmPage() {
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
            </tr>
          </thead>
          <tbody>
            {CONTACTS.map((c) => (
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
                          "h-full rounded-full",
                          c.score >= 85 ? "bg-emerald-500" : c.score >= 70 ? "bg-brand" : "bg-amber-500",
                        )}
                        style={{ width: `${c.score}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium tabular-nums">{c.score}</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-xs text-muted-foreground">{c.lastActivity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
