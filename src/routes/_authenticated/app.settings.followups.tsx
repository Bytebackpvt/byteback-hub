import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getFollowupConfig, saveFollowupConfig, type FollowupConfig } from "@/lib/workspace-settings.functions";

export const Route = createFileRoute("/_authenticated/app/settings/followups")({
  head: () => ({ meta: [{ title: "Follow-up rules — Settings" }, { name: "robots", content: "noindex" }] }),
  component: FollowupsPage,
});

const STEPS: { minutes: number; label: string }[] = [
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 240, label: "4 hours" },
  { minutes: 1440, label: "24 hours" },
  { minutes: 2880, label: "48 hours" },
];

function FollowupsPage() {
  const qc = useQueryClient();
  const callGet = useServerFn(getFollowupConfig);
  const callSave = useServerFn(saveFollowupConfig);

  const q = useQuery({
    queryKey: ["followup-config"],
    queryFn: () => callGet(),
    staleTime: 30_000,
  });

  const [cfg, setCfg] = useState<FollowupConfig | null>(null);
  useEffect(() => {
    if (q.data && !cfg) setCfg(q.data);
  }, [q.data, cfg]);

  const save = useMutation({
    mutationFn: (input: FollowupConfig) => callSave({ data: input }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["followup-config"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!cfg) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const toggleStep = (m: number) => {
    const has = cfg.ladder_minutes.includes(m);
    const next = has ? cfg.ladder_minutes.filter((x) => x !== m) : [...cfg.ladder_minutes, m].sort((a, b) => a - b);
    setCfg({ ...cfg, ladder_minutes: next });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Follow-up rules</h1>
        <p className="text-sm text-muted-foreground">
          When a customer email hasn't been replied to, we'll remind you at these intervals.
        </p>
      </header>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Follow-up engine</div>
            <div className="text-xs text-muted-foreground">Turn all reminders on or off.</div>
          </div>
          <Switch
            checked={cfg.enabled}
            onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Reminder ladder</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {STEPS.map((s) => {
            const on = cfg.ladder_minutes.includes(s.minutes);
            return (
              <button
                key={s.minutes}
                type="button"
                onClick={() => toggleStep(s.minutes)}
                className={
                  "rounded-md border px-3 py-2 text-sm transition " +
                  (on
                    ? "border-brand bg-brand/10 font-medium text-brand"
                    : "border-border/60 text-muted-foreground hover:border-foreground/40")
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Delivery channels</h2>
        <div className="space-y-2">
          {(
            [
              { key: "in_app", label: "In-app bell" },
              { key: "push", label: "Web push notifications" },
              { key: "email", label: "Email reminder" },
              { key: "slack", label: "Slack (via webhook)" },
            ] as const
          ).map((c) => (
            <div key={c.key} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <Label className="text-sm">{c.label}</Label>
              <Switch
                checked={cfg.channels[c.key]}
                onCheckedChange={(v) => setCfg({ ...cfg, channels: { ...cfg.channels, [c.key]: v } })}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate(cfg)} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
