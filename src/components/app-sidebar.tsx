import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  HelpCircle,
  Inbox,
  Kanban,
  LayoutDashboard,
  LogOut,
  Plug,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BrandLink } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentWorkspace } from "@/lib/workspace.functions";
import { listInstantlyThreads } from "@/lib/instantly.functions";
import { useServerFn } from "@tanstack/react-start";

const NAV: { to: string; label: string; icon: typeof Inbox; badgeKey?: "inbox"; tour: string }[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, tour: "nav-dashboard" },
  { to: "/app/inbox", label: "Unibox", icon: Inbox, badgeKey: "inbox", tour: "nav-inbox" },
  { to: "/app/pipeline", label: "Stages", icon: Kanban, tour: "nav-pipeline" },
  { to: "/app/integrations", label: "Integrations", icon: Plug, tour: "nav-integrations" },
  { to: "/app/help", label: "Help", icon: HelpCircle, tour: "nav-help" },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState<string>("");
  const callWorkspace = useServerFn(getCurrentWorkspace);
  const callThreads = useServerFn(listInstantlyThreads);
  const wsQuery = useQuery({
    queryKey: ["workspace", "current"],
    queryFn: () => callWorkspace(),
    staleTime: 60_000,
  });
  const inboxQ = useQuery({
    queryKey: ["inbox"],
    queryFn: () => callThreads(),
    staleTime: 30_000,
  });
  const role = wsQuery.data?.role ?? null;
  const inboxUnread = inboxQ.data?.threads?.filter((t) => t.unread).length ?? 0;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);


  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="overflow-hidden border-b border-border/60 px-4 py-3 group-data-[collapsible=icon]:px-2">
        <div className="min-w-0 [&_a]:min-w-0 [&_span]:min-w-0 group-data-[collapsible=icon]:[&_.brand-text]:hidden">
          <BrandLink />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const active = item.to === "/app" ? pathname === "/app" : pathname.startsWith(item.to);
                return (
                  <SidebarMenuItem key={item.to} data-tour={item.tour}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.to} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.label}</span>
                        {item.badgeKey === "inbox" && inboxUnread > 0 && (
                          <span className="ml-auto rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                            {inboxUnread > 99 ? "99+" : inboxUnread}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium">{email || "Loading…"}</div>
            <div className="text-[10px] capitalize text-muted-foreground">{role ?? "\u00A0"}</div>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex gap-1">
          <Button asChild variant="ghost" size="sm" className="flex-1 justify-start text-xs">
            <Link to="/app/settings/account">
              <Settings className="h-3.5 w-3.5" /> Settings
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-xs" title="Notifications">
            <Link to="/app/notifications/settings">
              <Bell className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-xs">
            <LogOut className="h-3.5 w-3.5" />
          </Button>

        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
