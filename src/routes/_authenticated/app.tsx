import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { OfflineBanner } from "@/components/offline-banner";
import { NotificationsBell } from "@/components/notifications-bell";
import { initNativeShell } from "@/lib/native";
import { GuidedTour, useGuidedTour } from "@/components/guided-tour";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

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
  const tour = useGuidedTour();
  useEffect(() => {
    initNativeShell();
  }, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur">
            <SidebarTrigger />
            <span className="text-sm font-medium text-muted-foreground md:hidden">ByteBack</span>
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={tour.reset}
                title="Start guided tour"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tour</span>
              </Button>
              <NotificationsBell />
            </div>
          </header>
          <OfflineBanner />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
      <GuidedTour open={tour.open} onClose={tour.close} />
    </SidebarProvider>
  );
}
