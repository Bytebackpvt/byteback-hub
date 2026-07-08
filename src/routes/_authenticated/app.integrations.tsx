import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Store, Plug2, Webhook } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/integrations")({
  head: () => ({
    meta: [{ title: "Integrations — ByteBack" }, { name: "robots", content: "noindex" }],
  }),
  component: IntegrationsLayout,
});

const TABS = [
  { to: "/app/integrations", label: "Marketplace", icon: Store, exact: true },
  { to: "/app/integrations/connected", label: "Connected", icon: Plug2, exact: false },
  { to: "/app/integrations/webhooks", label: "Direct webhooks", icon: Webhook, exact: false },
] as const;

function IntegrationsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect ByteBack to every tool your team already uses — email, CRM, chat, calendar, storage, automation.
        </p>
      </header>
      <nav className="flex flex-wrap items-center gap-1 border-b border-border/60">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={
                "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors " +
                (active
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
