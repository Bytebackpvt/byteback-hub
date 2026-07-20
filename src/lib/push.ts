/**
 * Web push registration helper. Registers /sw.js and subscribes the user to
 * PushManager when the workspace has a VAPID key configured (VITE_VAPID_PUBLIC_KEY).
 *
 * Delivery of pushes requires a backend cron/worker with the matching VAPID
 * private key — this scaffold handles the client half.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

let registered = false;

export async function ensurePushSubscription(): Promise<PushSubscription | null> {
  if (registered) return null;
  registered = true;
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  // Skip in Lovable preview iframes to avoid rogue SW installs.
  try {
    if (window.self !== window.top) return null;
  } catch {
    return null;
  }
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return null;

  const vapid = (import.meta.env as { VITE_VAPID_PUBLIC_KEY?: string }).VITE_VAPID_PUBLIC_KEY;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    if (!vapid) return null; // SW installed for future push, but no subscription yet.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid).buffer as ArrayBuffer,
    });

  } catch (err) {
    console.warn("[push] registration failed", err);
    return null;
  }
}
