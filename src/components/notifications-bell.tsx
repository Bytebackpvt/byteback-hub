import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, Check, Flame, Mail, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import {
  listNotifications,
  markNotificationsRead,
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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function NotificationsBell() {
  const qc = useQueryClient();
  const callList = useServerFn(listNotifications);
  const callMark = useServerFn(markNotificationsRead);
  const [sessionReady, setSessionReady] = useState(false);

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

  async function markAll() {
    if (!sessionReady) return;
    await callMark({ data: {} });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <div className="text-sm font-semibold">Notifications</div>
          {unread > 0 && (
            <button
              onClick={markAll}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <p className="p-8 text-center text-xs text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {notifications.map((n) => {
                const Icon = KIND_ICON[n.kind];
                const body = (
                  <div className="flex gap-2.5 p-3 text-left">
                    <Icon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        KIND_COLOR[n.kind],
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-sm font-medium leading-tight">
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      {n.body && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                    </div>
                    {!n.read_at && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    )}
                  </div>
                );
                return (
                  <li key={n.id} className={cn(!n.read_at && "bg-brand/[0.03]")}>
                    {n.link ? (
                      <Link
                        to={n.link}
                        className="block hover:bg-muted/40"
                        onClick={() => callMark({ data: { id: n.id } }).then(() => qc.invalidateQueries({ queryKey: ["notifications"] }))}
                      >
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
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
