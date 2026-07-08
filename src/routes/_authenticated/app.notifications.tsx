import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Archive,
  ArrowUpRight,
  Bell,
  BellRing,
  CheckCheck,
  Clock,
  Flame,
  Inbox,
  Loader2,
  MailPlus,
  Pin,
  PinOff,
  Settings2,
  Snowflake,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReminderPicker } from "@/components/reminder-picker";
import {
  listNotifications,
  markNotificationsRead,
  updateNotification,
  type NotificationRow,
  type NotificationKind,
} from "@/lib/notifications.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — ByteBack" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsInbox,
});

type Filter = "all" | "unread" | NotificationKind;

const KIND_META: Record<
  NotificationKind,
  { label: string; icon: typeof Bell; tone: string }
> = {
  hot_lead: { label: "Hot lead", icon: Flame, tone: "text-rose-500 bg-rose-500/10" },
  new_reply: { label: "New reply", icon: MailPlus, tone: "text-blue-500 bg-blue-500/10" },
  followup: { label: "Follow-up", icon: Clock, tone: "text-amber-500 bg-amber-500/10" },
  lost_lead: { label: "Lost", icon: Snowflake, tone: "text-slate-400 bg-slate-500/10" },
  info: { label: "Update", icon: Sparkles, tone: "text-violet-500 bg-violet-500/10" },
};

const TABS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "hot_lead", label: "Hot leads" },
  { value: "new_reply", label: "Replies" },
  { value: "followup", label: "Follow-ups" },
  { value: "lost_lead", label: "Lost" },
];

function NotificationsInbox() {
  const qc = useQueryClient();
  const callList = useServerFn(listNotifications);
  const callUpdate = useServerFn(updateNotification);
  const callMarkRead = useServerFn(markNotificationsRead);

  const [filter, setFilter] = useState<Filter>("all");
  const [reminderFor, setReminderFor] = useState<NotificationRow | null>(null);

  const q = useQuery({
    queryKey: ["notifications-inbox"],
    queryFn: () => callList(),
    refetchInterval: 30_000,
  });

  const notifications = q.data?.notifications ?? [];
  const unread = q.data?.unread ?? 0;

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((n) => !n.read_at);
    return notifications.filter((n) => n.kind === filter);
  }, [notifications, filter]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: notifications.length,
      unread,
      hot_lead: 0,
      new_reply: 0,
      followup: 0,
      lost_lead: 0,
      info: 0,
    };
    for (const n of notifications) c[n.kind] = (c[n.kind] ?? 0) + 1;
    return c;
  }, [notifications, unread]);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["notifications-inbox"] });

  const actionMut = useMutation({
    mutationFn: (v: {
      id: string;
      action:
        | "archive"
        | "unarchive"
        | "pin"
        | "unpin"
        | "snooze_1h"
        | "snooze_1d"
        | "unsnooze";
    }) => callUpdate({ data: v }),
    onSuccess: (_r, v) => {
      invalidate();
      if (v.action === "archive") toast.success("Archived");
      if (v.action === "snooze_1h") toast.success("Snoozed for 1 hour");
      if (v.action === "snooze_1d") toast.success("Snoozed for 1 day");
      if (v.action === "pin") toast.success("Pinned to top");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const markAllMut = useMutation({
    mutationFn: () => callMarkRead({ data: {} }),
    onSuccess: () => {
      toast.success("All caught up");
      invalidate();
    },
  });

  const markOneMut = useMutation({
    mutationFn: (id: string) => callMarkRead({ data: { id } }),
    onSuccess: () => invalidate(),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <BellRing className="h-5 w-5 text-primary" />
            Notification center
            {unread > 0 && (
              <Badge className="bg-rose-500 text-white hover:bg-rose-500/90">
                {unread} new
              </Badge>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hot leads, replies and follow-ups — all in one place. Nothing slips through.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllMut.mutate()}
            disabled={unread === 0 || markAllMut.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
          <Link to="/app/notifications/settings">
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4" />
              Preferences
            </Button>
          </Link>
        </div>
      </header>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-transparent p-0">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="data-[state=active]:bg-muted data-[state=active]:shadow-none"
            >
              {t.label}
              {counts[t.value] > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground data-[state=active]:bg-background">
                  {counts[t.value]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="rounded-xl border border-border/70 bg-card">
        {q.isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading notifications…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((n) => {
              const meta = KIND_META[n.kind] ?? KIND_META.info;
              const Icon = meta.icon;
              const isUnread = !n.read_at;
              return (
                <li
                  key={n.id}
                  className={cn(
                    "group flex items-start gap-3 p-4 transition",
                    isUnread && "bg-primary/[0.03]",
                    n.pinned && "border-l-2 border-l-primary",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 flex-none items-center justify-center rounded-lg",
                      meta.tone,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-sm",
                          isUnread ? "font-semibold" : "font-medium text-foreground/90",
                        )}
                      >
                        {n.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                      {n.pinned && <Pin className="h-3 w-3 text-primary" />}
                    </div>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {n.body}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {n.link && (
                        <Link
                          to={n.link}
                          onClick={() => isUnread && markOneMut.mutate(n.id)}
                        >
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                            Open <ArrowUpRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setReminderFor(n)}
                      >
                        <Bell className="h-3 w-3" /> Remind me
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          actionMut.mutate({ id: n.id, action: "snooze_1h" })
                        }
                      >
                        <Clock className="h-3 w-3" /> 1h
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          actionMut.mutate({ id: n.id, action: "snooze_1d" })
                        }
                      >
                        <Clock className="h-3 w-3" /> 1d
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          actionMut.mutate({
                            id: n.id,
                            action: n.pinned ? "unpin" : "pin",
                          })
                        }
                      >
                        {n.pinned ? (
                          <PinOff className="h-3 w-3" />
                        ) : (
                          <Pin className="h-3 w-3" />
                        )}
                        {n.pinned ? "Unpin" : "Pin"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => actionMut.mutate({ id: n.id, action: "archive" })}
                      >
                        <Archive className="h-3 w-3" /> Archive
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {reminderFor && (
        <ReminderPicker
          open={!!reminderFor}
          onOpenChange={(v) => !v && setReminderFor(null)}
          defaultTitle={reminderFor.title.replace(/^[^\w]+\s*/, "")}
          linkedTo={
            typeof reminderFor.meta?.category === "string"
              ? String(reminderFor.meta.category)
              : ""
          }
          threadId={reminderFor.thread_key}
          onScheduled={() => setReminderFor(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {filter === "unread" ? "You're all caught up" : "No notifications yet"}
        </p>
        <p className="max-w-xs text-xs text-muted-foreground">
          When new replies land, leads go hot, or follow-ups come due, you'll see them here.
        </p>
      </div>
      <Link to="/app/inbox">
        <Button size="sm" variant="outline">
          Open inbox
        </Button>
      </Link>
    </div>
  );
}
