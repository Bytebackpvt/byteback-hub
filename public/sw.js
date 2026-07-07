// ByteBack minimal service worker — network-first for navigations, offline fallback.
// Skips /~oauth entirely so managed OAuth flows always hit the network.
const CACHE = "byteback-v1";
const OFFLINE_FALLBACK = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never intercept OAuth broker, API, or non-GET requests.
  if (
    req.method !== "GET" ||
    url.pathname.startsWith("/~oauth") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Network-first for navigations, fall back to cached shell.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(OFFLINE_FALLBACK, fresh.clone()).catch(() => undefined);
          return fresh;
        } catch {
          const cache = await caches.open(CACHE);
          const cached = await cache.match(OFFLINE_FALLBACK);
          return (
            cached ??
            new Response("<h1>Offline</h1>", {
              headers: { "content-type": "text/html; charset=utf-8" },
              status: 503,
            })
          );
        }
      })(),
    );
  }
});
