import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ensurePushSubscription } from "@/lib/push";

type Status = {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  registered: boolean;
  subscribed: boolean;
};

async function readStatus(): Promise<Status> {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return { supported: false, permission: "unsupported", registered: false, subscribed: false };
  }
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return {
    supported: true,
    permission: Notification.permission,
    registered: Boolean(reg),
    subscribed: Boolean(sub),
  };
}

export function PushControls() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<"enable" | "test" | "disable" | null>(null);

  const refresh = () => readStatus().then(setStatus);
  useEffect(() => {
    refresh();
  }, []);

  const enable = async () => {
    setBusy("enable");
    try {
      // Register SW even if VAPID is missing; ensurePushSubscription handles both cases.
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.register("/sw.js");
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Permission denied — enable notifications in browser settings.");
      } else {
        await ensurePushSubscription().catch(() => null);
        toast.success("Notifications enabled");
      }
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy("test");
    try {
      if (Notification.permission !== "granted") {
        toast.error("Enable notifications first");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!reg) {
        toast.error("Service worker not registered");
        return;
      }
      await reg.showNotification("ByteBack test", {
        body: "If you see this, push delivery is wired up correctly.",
        icon: "/favicon.png",
        badge: "/favicon.png",
        tag: "byteback-test",
        data: { url: "/app" },
      });
      toast.success("Test notification sent");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const disable = async () => {
    setBusy("disable");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) await sub.unsubscribe();
      toast.success("Push subscription removed");
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  if (!status) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking browser support…
      </div>
    );
  }

  if (!status.supported) {
    return (
      <p className="text-sm text-muted-foreground">
        This browser does not support web push notifications.
      </p>
    );
  }

  const enabled = status.permission === "granted" && status.registered;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
          Permission: <b className="capitalize">{status.permission}</b>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
          Service worker: <b>{status.registered ? "registered" : "not registered"}</b>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
          Subscription: <b>{status.subscribed ? "active" : "none"}</b>
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {!enabled && (
          <Button size="sm" onClick={enable} disabled={busy !== null}>
            {busy === "enable" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bell className="h-3.5 w-3.5" />
            )}
            Enable push notifications
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={test} disabled={busy !== null || !enabled}>
          {busy === "test" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Send test notification
        </Button>
        {enabled && status.subscribed && (
          <Button size="sm" variant="ghost" onClick={disable} disabled={busy !== null}>
            {busy === "disable" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BellOff className="h-3.5 w-3.5" />
            )}
            Disable
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        The test uses your browser's local notification pipeline via the ByteBack service worker —
        no server delivery required. Background pushes for new hot leads and reminders will use the
        same channel once a VAPID key is configured.
      </p>
    </div>
  );
}
