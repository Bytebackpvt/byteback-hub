import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  Brain,
  CheckSquare,
  Clock,
  HelpCircle,
  Mail,
  Radar,
  Search,
  Sparkles,
  Thermometer,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ByteBack" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsLayout,
});

type Group = { label: string; items: { to: string; label: string; icon: typeof User; hint?: string }[] };

const GROUPS: Group[] = [
  {
    label: "Workspace",
    items: [
      { to: "/app/settings/account", label: "Account & data", icon: User, hint: "Sign-out, disconnect, delete" },
      { to: "/app/team", label: "Team", icon: Users, hint: "Invite and manage members" },
      { to: "/app/settings/temperatures", label: "Temperatures", icon: Thermometer, hint: "Hot / warm / cold labels" },
      { to: "/app/pipeline", label: "Stages", icon: Sparkles, hint: "Custom stage board" },
      { to: "/app/settings/followups", label: "Follow-up rules", icon: Clock, hint: "Reminder ladder & channels" },
    ],
  },
  {
    label: "Notifications",
    items: [
      { to: "/app/notifications/settings", label: "Preferences", icon: Bell, hint: "Push, email, quiet hours" },
      { to: "/app/notifications", label: "Notification feed", icon: Mail },
    ],
  },
  {
    label: "Data & tools",
    items: [
      { to: "/app/sync-status", label: "Sync status", icon: Activity, hint: "Backfill health & errors" },
      { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/app/radar", label: "Opportunity radar", icon: Radar },
      { to: "/app/tasks", label: "Tasks", icon: CheckSquare },
      { to: "/app/memory", label: "AI memory", icon: Brain },
      { to: "/app/search", label: "Advanced search", icon: Search, hint: "⌘K works anywhere" },
      { to: "/app/help", label: "Help & shortcuts", icon: HelpCircle },
    ],
  },
];

function SettingsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const atHub = pathname === "/app/settings" || pathname === "/app/settings/";

  if (atHub) return <SettingsHub />;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 p-6 md:grid-cols-[220px_1fr]">
      <aside className="hidden space-y-4 md:block">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {g.label}
            </div>
            <nav className="flex flex-col gap-0.5">
              {g.items.map((it) => (
                <Link
                  key={it.to}
                  to={it.to}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition",
                    pathname.startsWith(it.to)
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <it.icon className="h-3.5 w-3.5" />
                  {it.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

function SettingsHub() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Everything not in your inbox lives here — configure your workspace, notifications, and data tools.
        </p>
      </header>
      {GROUPS.map((g) => (
        <section key={g.label}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {g.label}
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {g.items.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 transition hover:border-brand/60 hover:shadow-sm"
              >
                <div className="rounded-md bg-muted p-2">
                  <it.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{it.label}</div>
                  {it.hint && (
                    <div className="text-xs text-muted-foreground">{it.hint}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
