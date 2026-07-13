import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Brain,
  CheckSquare,
  HelpCircle,
  Inbox,
  Mail,
  Kanban,
  LayoutDashboard,
  LogOut,
  Plug,
  Radar,
  Settings,
  Shield,
  Sparkles,
  Users,
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
import { listTasks } from "@/lib/tasks.functions";
import { useServerFn } from "@tanstack/react-start";

const NAV: { to: string; label: string; icon: typeof Inbox; badgeKey?: "inbox" | "tasks"; tour: string }[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, tour: "nav-dashboard" },
  { to: "/app/radar", label: "Opportunity Radar", icon: Radar, tour: "nav-radar" },
  { to: "/app/inbox", label: "Inbox", icon: Inbox, badgeKey: "inbox", tour: "nav-inbox" },
  { to: "/app/crm", label: "Contacts", icon: Users, tour: "nav-crm" },
  { to: "/app/pipeline", label: "Pipeline", icon: Kanban, tour: "nav-pipeline" },
  { to: "/app/tasks", label: "Tasks", icon: CheckSquare, badgeKey: "tasks", tour: "nav-tasks" },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3, tour: "nav-analytics" },
  { to: "/app/team", label: "Team", icon: Shield, tour: "nav-team" },
  { to: "/app/integrations", label: "Integrations", icon: Plug, tour: "nav-integrations" },
  { to: "/app/email-sources", label: "Email Sources", icon: Mail, tour: "nav-email-sources" },
  { to: "/app/notifications", label: "Notifications", icon: Bell, tour: "nav-notifications" },
  { to: "/app/memory", label: "AI Memory", icon: Brain, tour: "nav-memory" },
  { to: "/app/help", label: "Help", icon: HelpCircle, tour: "nav-help" },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState<string>("");
  const callWorkspace = useServerFn(getCurrentWorkspace);
  const wsQuery = useQuery({
    queryKey: ["workspace", "current"],
    queryFn: () => callWorkspace(),
    staleTime: 60_000,
  });
  const role = wsQuery.data?.role ?? null;

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
                        {item.badge && (
                          <span className="ml-auto rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                            {item.badge}
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

        <SidebarGroup>
          <SidebarGroupLabel>AI</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="rounded-lg border border-border/70 bg-gradient-to-br from-brand/10 to-transparent p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-brand" /> Daily summary
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">6 hot leads</span> replied
                overnight. 2 want to book a call this week.
              </p>
            </div>
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
          <Button variant="ghost" size="sm" onClick={signOut} className="text-xs">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
