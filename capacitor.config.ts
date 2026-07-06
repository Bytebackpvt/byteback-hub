import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor wrapper for the /app experience.
// For local native builds: `bun run build && npx cap sync`.
// The `server.url` below points to the Lovable preview so the native shell
// runs the live app during development. Remove `server.url` before shipping
// to the stores to bundle the built web assets instead.
const config: CapacitorConfig = {
  appId: "app.byteback.inbox",
  appName: "ByteBack Inbox",
  webDir: "dist",
  server: {
    url: "https://id-preview--cc239d7b-1706-4226-973f-f2f4c63de486.lovable.app",
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#0b0b12",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b0b12",
    },
  },
};

export default config;
