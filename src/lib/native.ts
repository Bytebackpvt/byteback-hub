// Lightweight Capacitor helpers — safe to import in the browser.
// All native calls are dynamic so the web bundle stays lean and SSR-safe.

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export async function initNativeShell() {
  if (!isNativeApp()) return;
  try {
    const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
      import("@capacitor/status-bar"),
      import("@capacitor/splash-screen"),
    ]);
    await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    await SplashScreen.hide().catch(() => {});
  } catch {
    // Plugins unavailable in web preview — ignore.
  }
}

export type NetStatus = { connected: boolean };

export async function subscribeNetwork(cb: (s: NetStatus) => void): Promise<() => void> {
  // Web fallback
  if (!isNativeApp()) {
    if (typeof window === "undefined") return () => {};
    const emit = () => cb({ connected: navigator.onLine });
    emit();
    window.addEventListener("online", emit);
    window.addEventListener("offline", emit);
    return () => {
      window.removeEventListener("online", emit);
      window.removeEventListener("offline", emit);
    };
  }
  try {
    const { Network } = await import("@capacitor/network");
    const status = await Network.getStatus();
    cb({ connected: status.connected });
    const handle = await Network.addListener("networkStatusChange", (s) =>
      cb({ connected: s.connected }),
    );
    return () => {
      handle.remove();
    };
  } catch {
    return () => {};
  }
}
