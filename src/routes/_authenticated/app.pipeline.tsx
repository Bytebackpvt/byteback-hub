import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  Circle,
  Flag,
  Flame,
  GripVertical,
  Inbox,
  Loader2,
  Pencil,
  Plug,
  Plus,
  Settings2,
  Star,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  listInstantlyLeads,
  updateLeadStatus,
  type InstantlyLead,
} from "@/lib/instantly.functions";
import {
  deletePipelineStage,
  listPipelineStages,
  reorderPipelineStages,
  runStageAutomation,
  upsertPipelineStage,
  type PipelineStage,
  type StageAutomation,
} from "@/lib/pipeline.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/pipeline")({
  component: PipelinePage,
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  circle: Circle,
  inbox: Inbox,
  flame: Flame,
  calendar: Calendar,
  trophy: Trophy,
  x: X,
  star: Star,
  flag: Flag,
  check: CheckCircle2,
  bell: Bell,
  zap: Zap,
};
const ICON_IDS = Object.keys(ICONS);

function StageIcon({ name, className }: { name: string; className?: string }) {
  const C = ICONS[name] ?? Circle;
  return <C className={className} />;
}


const COLOR_OPTIONS: Array<{ id: string; className: string; label: string }> = [
  { id: "sky", className: "bg-sky-500 border-t-sky-500", label: "Sky" },
  { id: "indigo", className: "bg-indigo-500 border-t-indigo-500", label: "Indigo" },
  { id: "violet", className: "bg-violet-500 border-t-violet-500", label: "Violet" },
  { id: "emerald", className: "bg-emerald-500 border-t-emerald-500", label: "Emerald" },
  { id: "amber", className: "bg-amber-500 border-t-amber-500", label: "Amber" },
  { id: "rose", className: "bg-rose-500 border-t-rose-500", label: "Rose" },
  { id: "slate", className: "bg-slate-500 border-t-slate-500", label: "Slate" },
];

function stageAccent(color: string) {
  const found = COLOR_OPTIONS.find((c) => c.id === color);
  return found?.className.split(" ").find((cls) => cls.startsWith("border-t-")) ?? "border-t-sky-500";
}
function stageSwatch(color: string) {
  const found = COLOR_OPTIONS.find((c) => c.id === color);
  return found?.className.split(" ").find((cls) => cls.startsWith("bg-")) ?? "bg-sky-500";
}

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function PipelinePage() {
  const qc = useQueryClient();
  const callListLeads = useServerFn(listInstantlyLeads);
  const callUpdateStatus = useServerFn(updateLeadStatus);
  const callListStages = useServerFn(listPipelineStages);
  const callUpsert = useServerFn(upsertPipelineStage);
  const callDelete = useServerFn(deletePipelineStage);
  const callReorder = useServerFn(reorderPipelineStages);
  const callRunAutomation = useServerFn(runStageAutomation);


  const stagesQuery = useQuery({
    queryKey: ["pipeline", "stages"],
    queryFn: () => callListStages(),
    staleTime: 60_000,
  });
  const stages: PipelineStage[] = stagesQuery.data?.stages ?? [];

  const leadsQuery = useQuery({
    queryKey: ["instantly", "leads"],
    queryFn: () => callListLeads(),
    staleTime: 60_000,
  });

  const connected = leadsQuery.data?.connected === true;
  const liveLeads = leadsQuery.data?.leads ?? [];

  const mutate = useMutation({
    mutationFn: (vars: { leadId: string; status: string }) =>
      // updateLeadStatus enforces its own enum server-side.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callUpdateStatus({ data: vars as any }),
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
            l.id === vars.leadId ? { ...l, status: vars.status as InstantlyLead["status"] } : l,
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
      toast.success("Stage updated");
    },
  });

  const byStage = useMemo(() => {
    const map = new Map<string, InstantlyLead[]>();
    for (const s of stages) map.set(s.slug, []);
    for (const l of liveLeads) {
      if (l.status === "bounced") continue;
      const bucket = map.get(l.status);
      if (bucket) bucket.push(l);
    }
    return map;
  }, [stages, liveLeads]);

  const totals = useMemo(() => {
    const total = liveLeads.filter((l) => l.status !== "bounced").length;
    const won = liveLeads.filter((l) => {
      const s = stages.find((st) => st.slug === l.status);
      return s?.is_won;
    }).length;
    return { total, won };
  }, [stages, liveLeads]);

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Plug
              className={cn("h-3 w-3", connected ? "text-emerald-500" : "text-muted-foreground/50")}
            />
            {connected
              ? `${totals.total} live leads · ${totals.won} won · custom stages`
              : "Demo mode · connect Instantly to move real leads"}
          </p>
        </div>
        <StageManager
          stages={stages}
          onSave={async (payload) => {
            await callUpsert({ data: payload });
            qc.invalidateQueries({ queryKey: ["pipeline", "stages"] });
          }}
          onDelete={async (id) => {
            await callDelete({ data: { id } });
            qc.invalidateQueries({ queryKey: ["pipeline", "stages"] });
          }}
          onReorder={async (order) => {
            await callReorder({ data: { order } });
            qc.invalidateQueries({ queryKey: ["pipeline", "stages"] });
          }}
        />
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex h-full min-w-max gap-3">
          {stagesQuery.isLoading && stages.length === 0 ? (
            <div className="flex w-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading stages…
            </div>
          ) : (
            stages.map((stage, idx) => {
              const leads = byStage.get(stage.slug) ?? [];
              const next = stages[idx + 1];
              return (
                <div
                  key={stage.id}
                  className={cn(
                    "flex w-72 shrink-0 flex-col rounded-xl border border-border/60 border-t-2 bg-muted/30",
                    stageAccent(stage.color),
                  )}
                >
                  <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className={cn("h-2 w-2 rounded-full", stageSwatch(stage.color))} />
                        {stage.label}
                        {stage.is_won && (
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                            WON
                          </span>
                        )}
                        {stage.is_lost && (
                          <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-600">
                            LOST
                          </span>
                        )}
                      </div>
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
                          {next && connected && (
                            <button
                              onClick={() =>
                                mutate.mutate({ leadId: l.id, status: next.slug })
                              }
                              className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-brand opacity-0 transition group-hover:opacity-100 hover:bg-brand/10"
                            >
                              → {next.label}
                              <ArrowRight className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {leads.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border/50 p-4 text-center text-[11px] text-muted-foreground">
                        {connected ? "No leads here." : "Demo · move real leads once connected."}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ------------ Stage manager sheet ------------

type StagePayload = {
  id: string | null;
  slug: string;
  label: string;
  color: string;
  is_won: boolean;
  is_lost: boolean;
};

function StageManager({
  stages,
  onSave,
  onDelete,
  onReorder,
}: {
  stages: PipelineStage[];
  onSave: (payload: StagePayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (order: string[]) => Promise<void>;
}) {
  const [editing, setEditing] = useState<StagePayload | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  function startNew() {
    setEditing({ id: null, slug: "", label: "", color: "sky", is_won: false, is_lost: false });
  }
  function startEdit(s: PipelineStage) {
    setEditing({
      id: s.id,
      slug: s.slug,
      label: s.label,
      color: s.color,
      is_won: s.is_won,
      is_lost: s.is_lost,
    });
  }

  async function save() {
    if (!editing) return;
    const slug = editing.slug || slugify(editing.label);
    if (!editing.label.trim() || !slug) {
      toast.error("Label required");
      return;
    }
    try {
      await onSave({ ...editing, slug });
      toast.success(editing.id ? "Stage updated" : "Stage added");
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function reorderDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = stages.map((s) => s.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setDragId(null);
    await onReorder(ids);
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          <Settings2 className="h-3.5 w-3.5" /> Customize stages
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Customize pipeline</SheetTitle>
          <SheetDescription>
            Rename, recolor, reorder, or add stages. Slugs are used to match Instantly lead statuses.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {stages.map((s) => (
            <div
              key={s.id}
              draggable
              onDragStart={() => setDragId(s.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => reorderDrop(s.id)}
              className={cn(
                "flex items-center gap-2 rounded-md border border-border/60 bg-card p-2 transition",
                dragId === s.id && "opacity-50",
              )}
            >
              <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
              <span className={cn("h-2.5 w-2.5 rounded-full", stageSwatch(s.color))} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{s.label}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  slug: {s.slug}
                  {s.is_won && " · won"}
                  {s.is_lost && " · lost"}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(s)} aria-label={`Edit ${s.label}`} title="Edit stage">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${s.label}`}
                title="Delete stage"
                className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                onClick={async () => {
                  if (!confirm(`Delete stage "${s.label}"?`)) return;
                  try {
                    await onDelete(s.id);
                    toast.success("Deleted");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Delete failed");
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" className="w-full" onClick={startNew}>
            <Plus className="h-3.5 w-3.5" /> Add stage
          </Button>
        </div>

        {editing && (
          <div className="mt-6 rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="mb-3 text-sm font-semibold">
              {editing.id ? "Edit stage" : "New stage"}
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="stage-label" className="text-xs">
                  Label
                </Label>
                <Input
                  id="stage-label"
                  value={editing.label}
                  onChange={(e) =>
                    setEditing((prev) =>
                      prev
                        ? {
                            ...prev,
                            label: e.target.value,
                            slug: prev.id ? prev.slug : slugify(e.target.value),
                          }
                        : prev,
                    )
                  }
                  placeholder="Negotiation"
                />
              </div>
              <div>
                <Label htmlFor="stage-slug" className="text-xs">
                  Slug
                </Label>
                <Input
                  id="stage-slug"
                  value={editing.slug}
                  onChange={(e) =>
                    setEditing((prev) => (prev ? { ...prev, slug: slugify(e.target.value) } : prev))
                  }
                  placeholder="negotiation"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Must match an Instantly status to auto-populate.
                </p>
              </div>
              <div>
                <Label className="text-xs">Color</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setEditing((prev) => (prev ? { ...prev, color: c.id } : prev))
                      }
                      className={cn(
                        "h-6 w-6 rounded-full ring-offset-2 ring-offset-background transition",
                        c.className.split(" ").find((cls) => cls.startsWith("bg-")),
                        editing.color === c.id && "ring-2 ring-foreground",
                      )}
                      aria-label={c.label}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Won stage</Label>
                  <p className="text-[10px] text-muted-foreground">Counted as closed-won.</p>
                </div>
                <Switch
                  checked={editing.is_won}
                  onCheckedChange={(v) =>
                    setEditing((prev) =>
                      prev ? { ...prev, is_won: v, is_lost: v ? false : prev.is_lost } : prev,
                    )
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Lost stage</Label>
                  <p className="text-[10px] text-muted-foreground">Counted as closed-lost.</p>
                </div>
                <Switch
                  checked={editing.is_lost}
                  onCheckedChange={(v) =>
                    setEditing((prev) =>
                      prev ? { ...prev, is_lost: v, is_won: v ? false : prev.is_won } : prev,
                    )
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={save}>
                  Save stage
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
