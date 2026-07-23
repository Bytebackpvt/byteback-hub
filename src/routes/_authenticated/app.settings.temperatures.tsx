import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listTemperatures,
  upsertTemperature,
  deleteTemperature,
} from "@/lib/workspace-settings.functions";

export const Route = createFileRoute("/_authenticated/app/settings/temperatures")({
  head: () => ({ meta: [{ title: "Temperatures — Settings" }, { name: "robots", content: "noindex" }] }),
  component: TemperaturesPage,
});

function TemperaturesPage() {
  const qc = useQueryClient();
  const callList = useServerFn(listTemperatures);
  const callUpsert = useServerFn(upsertTemperature);
  const callDelete = useServerFn(deleteTemperature);

  const q = useQuery({
    queryKey: ["workspace-temperatures"],
    queryFn: () => callList(),
    staleTime: 30_000,
  });

  const [draft, setDraft] = useState({ slug: "", label: "", color: "#8b5cf6" });

  const upsert = useMutation({
    mutationFn: (input: { slug: string; label: string; color: string; sort_order?: number }) =>
      callUpsert({ data: { ...input, sort_order: input.sort_order ?? 100 } }),
    onSuccess: () => {
      toast.success("Saved");
      setDraft({ slug: "", label: "", color: "#8b5cf6" });
      qc.invalidateQueries({ queryKey: ["workspace-temperatures"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => callDelete({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["workspace-temperatures"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Temperatures</h1>
        <p className="text-sm text-muted-foreground">
          AI auto-tags every conversation. Add custom labels for your workflow — built-in ones can't be
          deleted.
        </p>
      </header>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Current labels</h2>
        {q.isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {(q.data?.temperatures ?? []).map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2">
                <span
                  className="h-4 w-4 rounded-full border border-border/60"
                  style={{ backgroundColor: t.color }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {t.slug} {t.is_system && "· built-in"}
                  </div>
                </div>
                {!t.is_system && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove.mutate(t.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Add a custom temperature</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_80px_auto]">
          <div>
            <Label className="text-xs">Slug</Label>
            <Input
              value={draft.slug}
              onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value.toLowerCase() }))}
              placeholder="qualified"
            />
          </div>
          <div>
            <Label className="text-xs">Label</Label>
            <Input
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              placeholder="Qualified"
            />
          </div>
          <div>
            <Label className="text-xs">Color</Label>
            <Input
              type="color"
              value={draft.color}
              onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
              className="h-9 p-1"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => upsert.mutate(draft)}
              disabled={upsert.isPending || !draft.slug || !draft.label}
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
