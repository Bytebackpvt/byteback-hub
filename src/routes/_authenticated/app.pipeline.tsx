import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, Plug, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  listInstantlyLeads,
  updateLeadStatus,
  type InstantlyLead,
} from "@/lib/instantly.functions";
import { DEALS, STAGES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/pipeline")({
  component: PipelinePage,
});

type LiveStageId = "new" | "interested" | "meeting" | "customer" | "not-interested";

const LIVE_STAGES: { id: LiveStageId; label: string; accent: string }[] = [
  { id: "new", label: "New replies", accent: "border-t-sky-500" },
  { id: "interested", label: "Interested", accent: "border-t-brand" },
  { id: "meeting", label: "Meeting booked", accent: "border-t-violet-500" },
  { id: "customer", label: "Closed won", accent: "border-t-emerald-500" },
  { id: "not-interested", label: "Lost", accent: "border-t-rose-500" },
];

const NEXT_STAGE: Record<LiveStageId, LiveStageId | null> = {
  new: "interested",
  interested: "meeting",
  meeting: "customer",
  customer: null,
  "not-interested": null,
};

function PipelinePage() {
  const qc = useQueryClient();
  const callListLeads = useServerFn(listInstantlyLeads);
  const callUpdateStatus = useServerFn(updateLeadStatus);

  const leadsQuery = useQuery({
    queryKey: ["instantly", "leads"],
    queryFn: () => callListLeads(),
    staleTime: 60_000,
  });

  const connected = leadsQuery.data?.connected === true;
  const liveLeads = leadsQuery.data?.leads ?? [];

  const mutate = useMutation({
    mutationFn: (vars: { leadId: string; status: LiveStageId }) =>
      callUpdateStatus({ data: vars }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["instantly", "leads"] });
      const prev = qc.getQueryData<{ leads: InstantlyLead[]; connected: boolean }>([
        "instantly",
        "leads",
      ]);
      qc.setQueryData(["instantly", "leads"], (data: typeof prev) => {
        if (!data) return data;
        return {
          ...data,
          leads: data.leads.map((l) =>
            l.id === vars.leadId ? { ...l, status: vars.status } : l,
          ),
        };
      });
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["instantly", "leads"], ctx.prev);
      toast.error(err instanceof Error ? err.message : "Failed to update");
    },
    onSuccess: () => {
      toast.success("Stage updated in Instantly");
    },
  });

  const byStage = useMemo(() => {
    const map: Record<LiveStageId, InstantlyLead[]> = {
      new: [],
      interested: [],
      meeting: [],
      customer: [],
      "not-interested": [],
    };
    for (const l of liveLeads) {
      if (l.status === "bounced") continue;
      map[l.status as LiveStageId]?.push(l);
    }
    return map;
  }, [liveLeads]);

  if (!connected && !leadsQuery.isLoading) {
    // Demo fallback view
    const total = DEALS.reduce((s, d) => s + d.value, 0);
    return (
      <div className="flex h-[calc(100vh-3rem)] flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Plug className="h-3 w-3 text-muted-foreground/50" />
              Demo data · connect Instantly to see live pipeline
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {DEALS.length} deals · ${total.toLocaleString()} total value
            </p>
          </div>
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" /> New deal
          </Button>
        </div>
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex h-full min-w-max gap-3">
            {STAGES.map((stage) => {
              const deals = DEALS.filter((d) => d.stage === stage.id);
              const stageValue = deals.reduce((s, d) => s + d.value, 0);
              return (
                <div
                  key={stage.id}
                  className={cn(
                    "flex w-72 shrink-0 flex-col rounded-xl border border-border/60 border-t-2 bg-muted/30",
                    stage.accent,
                  )}
                >
                  <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
                    <div>
                      <div className="text-sm font-semibold">{stage.label}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {deals.length} · ${(stageValue / 1000).toFixed(0)}k
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto p-2">
                    {deals.map((d) => (
                      <div
                        key={d.id}
                        className="rounded-lg border border-border/60 bg-card p-3 shadow-sm"
                      >
                        <div className="text-sm font-medium leading-tight">{d.title}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {d.contact}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm font-semibold tabular-nums">
                            ${d.value.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {d.probability}% · {d.closeDate}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Plug className="h-3 w-3 text-emerald-500" />
            {leadsQuery.isLoading
              ? "Loading pipeline…"
              : `${liveLeads.filter((l) => l.status !== "bounced").length} live leads from Instantly · stage changes sync back`}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex h-full min-w-max gap-3">
          {LIVE_STAGES.map((stage) => {
            const leads = byStage[stage.id];
            const next = NEXT_STAGE[stage.id];
            return (
              <div
                key={stage.id}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-xl border border-border/60 border-t-2 bg-muted/30",
                  stage.accent,
                )}
              >
                <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
                  <div>
                    <div className="text-sm font-semibold">{stage.label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {leads.length} {leads.length === 1 ? "lead" : "leads"}
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-2">
                  {leads.map((l) => (
                    <div
                      key={l.id}
                      className="group rounded-lg border border-border/60 bg-card p-3 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium leading-tight">
                            {l.name}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {l.company}
                          </div>
                        </div>
                        {mutate.isPending && mutate.variables?.leadId === l.id && (
                          <Loader2 className="h-3 w-3 animate-spin text-brand" />
                        )}
                      </div>
                      <div className="mt-2 truncate text-[10px] text-muted-foreground">
                        {l.email}
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {l.lastActivity}
                        </span>
                        {next && (
                          <button
                            onClick={() =>
                              mutate.mutate({ leadId: l.id, status: next })
                            }
                            className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-brand opacity-0 transition group-hover:opacity-100 hover:bg-brand/10"
                          >
                            Move <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {leads.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border/50 p-4 text-center text-[11px] text-muted-foreground">
                      No leads here.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
