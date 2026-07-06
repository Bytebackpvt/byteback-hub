# Capacitor Mobile Build

The `/app` experience is packaged as a Capacitor shell for iOS and Android.

## First-time setup (local machine, not the Lovable sandbox)

```bash
bun install
bunx cap add ios
bunx cap add android
```

## Development (live-reload from Lovable preview)

`capacitor.config.ts` sets `server.url` to the Lovable preview URL, so the
native app loads the live web build with no rebuild needed.

```bash
bunx cap sync
bunx cap run ios       # requires Xcode
bunx cap run android   # requires Android Studio
```

## Shipping to the stores

1. Remove the `server.url` block in `capacitor.config.ts` so the app bundles
   the built web assets instead of pointing at the preview.
2. Build the web app and sync:
   ```bash
   bun run build
   bunx cap sync
   ```
3. Open the native project and archive:
   ```bash
   bunx cap open ios
   bunx cap open android
   ```

## Offline behavior

- TanStack Query is configured with `networkMode: "offlineFirst"` and a 24h
  cache retention so recently viewed data stays visible without a connection.
- `<OfflineBanner />` in `app.tsx` listens to `@capacitor/network` on native
  and `window.online/offline` on web, and surfaces a banner when disconnected.
- Mutations queue and retry once the network returns.

## Responsive navigation

The `SidebarProvider` (shadcn) automatically renders the sidebar as a slide-in
sheet under 768px, driven by the `SidebarTrigger` in the header — no extra
code needed for phone form factors.
