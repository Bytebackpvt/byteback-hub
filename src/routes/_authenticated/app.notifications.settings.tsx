import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Bell, Loader2, Mail, Moon, Webhook } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  NOTIFICATION_KINDS,
  NOTIFICATION_CHANNELS,
  DEFAULT_QUIET_HOURS,
  type NotificationChannel,
  type NotificationKind,
  type PrefMap,
  type QuietHours,
} from "@/lib/notification-prefs.functions";

export const Route = createFileRoute("/_authenticated/app/notifications/settings")({
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

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const formatHour = (h: number) => `${String(h).padStart(2, "0")}:00`;

// A short curated list — users can also see whatever timezone was saved for them.
const TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Istanbul",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

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
  const [quiet, setQuiet] = useState<QuietHours>(DEFAULT_QUIET_HOURS);
  useEffect(() => {
    if (q.data?.prefs) setPrefs(q.data.prefs);
    if (q.data?.quiet) setQuiet(q.data.quiet);
  }, [q.data?.prefs, q.data?.quiet]);

  const saveMut = useMutation({
    mutationFn: (payload: { prefs: PrefMap; quiet: QuietHours }) =>
      callSave({ data: payload }),
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

  const tzOptions = useMemo(() => {
    const set = new Set(TIMEZONES);
    if (quiet.timezone) set.add(quiet.timezone);
    return Array.from(set);
  }, [quiet.timezone]);

  const dirty =
    prefs && q.data?.prefs
      ? JSON.stringify(prefs) !== JSON.stringify(q.data.prefs) ||
        JSON.stringify(quiet) !== JSON.stringify(q.data.quiet)
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

      <section className="rounded-xl border border-border/70 bg-card p-4 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Quiet hours</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Silence email and webhook alerts during these hours (in-app notifications
              still appear).
            </p>
          </div>
          <Switch
            checked={quiet.enabled}
            onCheckedChange={(v) => setQuiet((s) => ({ ...s, enabled: v }))}
            aria-label="Enable quiet hours"
          />
        </div>

        <div
          className={`mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 ${
            quiet.enabled ? "" : "pointer-events-none opacity-50"
          }`}
        >
          <div className="space-y-1.5">
            <Label htmlFor="qh-start">From</Label>
            <Select
              value={String(quiet.start)}
              onValueChange={(v) => setQuiet((s) => ({ ...s, start: Number(v) }))}
            >
              <SelectTrigger id="qh-start">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {formatHour(h)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qh-end">Until</Label>
            <Select
              value={String(quiet.end)}
              onValueChange={(v) => setQuiet((s) => ({ ...s, end: Number(v) }))}
            >
              <SelectTrigger id="qh-end">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {formatHour(h)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qh-tz">Timezone</Label>
            <Select
              value={quiet.timezone}
              onValueChange={(v) => setQuiet((s) => ({ ...s, timezone: v }))}
            >
              <SelectTrigger id="qh-tz">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tzOptions.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-2">
        {dirty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (q.data?.prefs) setPrefs(q.data.prefs);
              if (q.data?.quiet) setQuiet(q.data.quiet);
            }}
            disabled={saveMut.isPending}
          >
            Discard
          </Button>
        )}
        <Button
          size="sm"
          onClick={() => prefs && saveMut.mutate({ prefs, quiet })}
          disabled={!dirty || saveMut.isPending}
        >
          {saveMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
