import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { OfflineBanner } from "@/components/offline-banner";
import { initNativeShell } from "@/lib/native";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "ByteBack — Unified Inbox" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  useEffect(() => {
    initNativeShell();
  }, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur">
            <SidebarTrigger />
            <span className="text-sm font-medium text-muted-foreground md:hidden">ByteBack</span>
          </header>
          <OfflineBanner />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
