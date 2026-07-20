// ByteBack notification service worker.
// Handles web push events and notification clicks. Intentionally does NOT
// pre-cache app shell — Lovable serves the SPA fresh.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "ByteBack", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "ByteBack";
  const options = {
    body: data.body || "",
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: data.tag || "byteback",
    data: { url: data.url || "/app" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus().then(() => client.navigate(target));
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
});
