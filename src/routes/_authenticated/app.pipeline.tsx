import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEALS, STAGES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/pipeline")({
  component: PipelinePage,
});

function PipelinePage() {
  const total = DEALS.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-xs text-muted-foreground">
            {DEALS.length} deals · ${total.toLocaleString()} total pipeline value
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
                  <button className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-2">
                  {deals.map((d) => (
                    <div
                      key={d.id}
                      className="cursor-grab rounded-lg border border-border/60 bg-card p-3 shadow-sm transition hover:shadow-md"
                    >
                      <div className="text-sm font-medium leading-tight">{d.title}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{d.contact}</div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-semibold tabular-nums">
                          ${d.value.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {d.probability}% · {d.closeDate}
                        </span>
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${d.probability}%` }}
                        />
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
