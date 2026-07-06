import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  Check,
  Clock,
  Flame,
  Mail,
  Pin,
  PinOff,
  TrendingDown,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  listNotifications,
  markNotificationsRead,
  updateNotification,
  type NotificationKind,
  type NotificationRow,
} from "@/lib/notifications.functions";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  hot_lead: Flame,
  new_reply: Mail,
  lost_lead: TrendingDown,
  followup: Bell,
  info: Bell,
};

const KIND_COLOR: Record<NotificationKind, string> = {
  hot_lead: "text-rose-500",
  new_reply: "text-sky-500",
  lost_lead: "text-muted-foreground",
  followup: "text-amber-500",
  info: "text-muted-foreground",
};

const PUSH_KINDS: ReadonlySet<NotificationKind> = new Set<NotificationKind>([
  "hot_lead",
  "followup",
  "new_reply",
]);

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

type Tab = "all" | "unread" | "pinned";

export function NotificationsBell() {
  const qc = useQueryClient();
  const callList = useServerFn(listNotifications);
  const callMark = useServerFn(markNotificationsRead);
  const callUpdate = useServerFn(updateNotification);
  const [sessionReady, setSessionReady] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [pushState, setPushState] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );
  const seenIds = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session?.access_token) setSessionReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session?.access_token) setSessionReady(true);
      if (active && !session) setSessionReady(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => callList(),
    enabled: sessionReady,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const notifications: NotificationRow[] = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  // Browser push: fire native notifications for new high-signal alerts.
  useEffect(() => {
    if (!notifications.length) return;
    if (!primed.current) {
      notifications.forEach((n) => seenIds.current.add(n.id));
      primed.current = true;
      return;
    }
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    for (const n of notifications) {
      if (seenIds.current.has(n.id)) continue;
      seenIds.current.add(n.id);
      if (!PUSH_KINDS.has(n.kind) || n.read_at) continue;
      try {
        const notif = new Notification(n.title, {
          body: n.body || undefined,
          tag: n.id,
          icon: "/favicon.ico",
        });
        notif.onclick = () => {
          window.focus();
          if (n.link) window.location.href = n.link;
        };
      } catch {
        // ignore browser errors
      }
    }
  }, [notifications]);

  async function enablePush() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPushState(result);
  }

  const filtered = notifications.filter((n) => {
    if (tab === "unread") return !n.read_at;
    if (tab === "pinned") return n.pinned;
    return true;
  });

  async function markAll() {
    if (!sessionReady) return;
    await callMark({ data: {} });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function act(id: string, action: Parameters<typeof callUpdate>[0]["data"]["action"]) {
    await callUpdate({ data: { id, action } });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[26rem] p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <div className="text-sm font-semibold">Notifications</div>
          <div className="flex items-center gap-1">
            {pushState !== "granted" && pushState !== "unsupported" && (
              <button
                onClick={enablePush}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-brand hover:bg-brand/10"
                title="Enable browser push notifications"
              >
                <BellOff className="h-3 w-3" /> Enable push
              </button>
            )}
            {unread > 0 && (
              <button
                onClick={markAll}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1 border-b border-border/60 px-2 py-1.5 text-xs">
          {(["all", "unread", "pinned"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-2 py-1 capitalize transition-colors",
                tab === t
                  ? "bg-brand/10 text-brand"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t}
              {t === "unread" && unread > 0 && (
                <span className="ml-1 text-[10px] font-bold">{unread}</span>
              )}
            </button>
          ))}
        </div>
        <ScrollArea className="max-h-[26rem]">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-xs text-muted-foreground">
              {tab === "unread"
                ? "You're all caught up."
                : tab === "pinned"
                  ? "No pinned notifications."
                  : "No notifications yet."}
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {filtered.map((n) => {
                const Icon = KIND_ICON[n.kind];
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "group relative",
                      !n.read_at && "bg-brand/[0.03]",
                      n.pinned && "border-l-2 border-brand",
                    )}
                  >
                    <div className="flex gap-2.5 p-3">
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", KIND_COLOR[n.kind])} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          {n.link ? (
                            <Link
                              to={n.link}
                              className="truncate text-sm font-medium leading-tight hover:text-brand"
                              onClick={() =>
                                callMark({ data: { id: n.id } }).then(() =>
                                  qc.invalidateQueries({ queryKey: ["notifications"] }),
                                )
                              }
                            >
                              {n.title}
                            </Link>
                          ) : (
                            <span className="truncate text-sm font-medium leading-tight">
                              {n.title}
                            </span>
                          )}
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        {n.body && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {n.body}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              aria-label="Notification actions"
                            >
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onSelect={() => act(n.id, "snooze_1h")}>
                              Snooze 1 hour
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => act(n.id, "snooze_1d")}>
                              Snooze 1 day
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => act(n.id, n.pinned ? "unpin" : "pin")}
                            >
                              {n.pinned ? (
                                <>
                                  <PinOff className="mr-2 h-3.5 w-3.5" /> Unpin
                                </>
                              ) : (
                                <>
                                  <Pin className="mr-2 h-3.5 w-3.5" /> Pin
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => act(n.id, "archive")}
                          aria-label="Archive"
                          title="Archive"
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                      {!n.read_at && (
                        <span className="absolute right-2 top-3 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
