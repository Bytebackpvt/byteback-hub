import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell, Loader2, Mail, Webhook } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  NOTIFICATION_KINDS,
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
  type NotificationKind,
  type PrefMap,
} from "@/lib/notification-prefs.functions";

export const Route = createFileRoute("/_authenticated/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notification preferences — ByteBack" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsSettings,
});

const KIND_META: Record<NotificationKind, { label: string; blurb: string }> = {
  hot_lead: {
    label: "Hot leads",
    blurb: "High-intent replies the AI classifies as ready-to-buy.",
  },
  followup: {
    label: "Follow-up reminders",
    blurb: "Scheduled reminders and overdue-task escalations.",
  },
  lost_lead: {
    label: "Lost / cold leads",
    blurb: "Alerts when a lead is marked Not interested or Unsubscribe.",
  },
  mention: {
    label: "Mentions & assignments",
    blurb: "When a teammate @mentions you or assigns you a lead.",
  },
  digest: {
    label: "Daily digest",
    blurb: "Once-per-day summary of new leads, replies and open tasks.",
  },
};

const CHANNEL_META: Record<
  NotificationChannel,
  { label: string; icon: typeof Bell }
> = {
  in_app: { label: "In-app", icon: Bell },
  email: { label: "Email", icon: Mail },
  webhook: { label: "Webhook", icon: Webhook },
};

function NotificationsSettings() {
  const qc = useQueryClient();
  const callGet = useServerFn(getNotificationPreferences);
  const callSave = useServerFn(saveNotificationPreferences);

  const q = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: () => callGet(),
    staleTime: 30_000,
  });

  const [prefs, setPrefs] = useState<PrefMap | null>(null);
  useEffect(() => {
    if (q.data?.prefs) setPrefs(q.data.prefs);
  }, [q.data?.prefs]);

  const saveMut = useMutation({
    mutationFn: (next: PrefMap) => callSave({ data: { prefs: next } }),
    onSuccess: () => {
      toast.success("Notification preferences saved");
      qc.invalidateQueries({ queryKey: ["notification-prefs"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggle = (kind: NotificationKind, channel: NotificationChannel) => {
    if (!prefs) return;
    setPrefs({
      ...prefs,
      [kind]: { ...prefs[kind], [channel]: !prefs[kind][channel] },
    });
  };

  const dirty =
    prefs && q.data?.prefs
      ? JSON.stringify(prefs) !== JSON.stringify(q.data.prefs)
      : false;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which alerts you want to receive and how they should reach you. Webhook
          delivery uses the outbound connections configured on the{" "}
          <a href="/app/integrations" className="underline underline-offset-2">
            Integrations
          </a>{" "}
          page.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-border/70 bg-muted/30 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <div>Event</div>
          {NOTIFICATION_CHANNELS.map((c) => {
            const Icon = CHANNEL_META[c].icon;
            return (
              <div key={c} className="flex w-20 items-center justify-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {CHANNEL_META[c].label}
              </div>
            );
          })}
        </div>

        {q.isLoading || !prefs ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading preferences…
          </div>
        ) : (
          NOTIFICATION_KINDS.map((kind, idx) => (
            <div
              key={kind}
              className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-4 ${
                idx > 0 ? "border-t border-border/60" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="font-medium">{KIND_META[kind].label}</div>
                <div className="text-xs text-muted-foreground">{KIND_META[kind].blurb}</div>
              </div>
              {NOTIFICATION_CHANNELS.map((channel) => (
                <div key={channel} className="flex w-20 justify-center">
                  <Switch
                    checked={prefs[kind][channel]}
                    onCheckedChange={() => toggle(kind, channel)}
                    aria-label={`${KIND_META[kind].label} — ${CHANNEL_META[channel].label}`}
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        {dirty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => q.data?.prefs && setPrefs(q.data.prefs)}
            disabled={saveMut.isPending}
          >
            Discard
          </Button>
        )}
        <Button
          size="sm"
          onClick={() => prefs && saveMut.mutate(prefs)}
          disabled={!dirty || saveMut.isPending}
        >
          {saveMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
