import {
  createFileRoute,
  Link,
  Outlet,
  useMatchRoute,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { Check } from "lucide-react";

import { BrandLink } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your workspace · ByteBack Inbox AI" },
      { name: "description", content: "Get your unified inbox ready in under 2 minutes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingLayout,
});

const STEPS = [
  { path: "/onboarding/workspace", label: "Workspace" },
  { path: "/onboarding/team", label: "Team" },
  { path: "/onboarding/email-accounts", label: "Inboxes" },
  { path: "/onboarding/business-type", label: "Business" },
  { path: "/onboarding/done", label: "Done" },
] as const;

function OnboardingLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const matchRoute = useMatchRoute();

  // Redirect bare /onboarding to first step
  if (pathname === "/onboarding" || pathname === "/onboarding/") {
    navigate({ to: "/onboarding/workspace", replace: true });
  }

  const currentIdx = Math.max(
    0,
    STEPS.findIndex((s) => !!matchRoute({ to: s.path })),
  );
  const progress = ((currentIdx + 1) / STEPS.length) * 100;

  return (
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px] bg-radial-brand" />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <BrandLink />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            Exit
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 pb-4 sm:px-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {currentIdx + 1} of {STEPS.length}
          </span>
          <span>~2 min</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-4 hidden items-center justify-between gap-2 sm:flex">
          {STEPS.map((s, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <div
                key={s.path}
                className={`flex items-center gap-1.5 text-xs ${
                  active
                    ? "text-foreground"
                    : done
                      ? "text-brand"
                      : "text-muted-foreground/70"
                }`}
              >
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold ${
                    active
                      ? "bg-foreground text-background"
                      : done
                        ? "bg-brand text-brand-foreground"
                        : "bg-muted"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {s.label}
              </div>
            );
          })}
        </div>
      </div>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:px-6">
        <div className="w-full max-w-2xl">
          <div className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-xl backdrop-blur sm:p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
