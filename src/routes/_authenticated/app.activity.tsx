import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, User, ArrowLeft } from "lucide-react";
import { getDashboard } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/app/activity")({
  head: () => ({
    meta: [
      { title: "Activity log — ByteBack" },
      { name: "description", content: "Full log of AI classifications and manual stage/temperature changes across your workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const call = useServerFn(getDashboard);
  const q = useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: () => call(),
    staleTime: 15_000,
  });
  const rows = q.data?.activity ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <Link
        to="/app/dashboard"
        className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
      >
        <ArrowLeft className="h-3 w-3" /> Back to dashboard
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Activity log</h1>
        <p className="text-sm text-muted-foreground">
          Every AI classification and manual stage/temperature change — the basis for your follow-ups.
        </p>
      </div>
      <div className="rounded-lg border bg-card shadow-sm">
        <ul className="divide-y">
          {q.isLoading && <li className="p-3 text-xs text-muted-foreground">Loading…</li>}
          {!q.isLoading && rows.length === 0 && (
            <li className="p-3 text-xs text-muted-foreground">No activity yet.</li>
          )}
          {rows.map((a) => (
            <li key={a.id} className="flex gap-2 px-3 py-2 text-sm">
              {a.kind === "ai" ? (
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
              ) : (
                <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium">{a.title}</span>
                  <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                    {new Date(a.at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {a.detail && (
                  <div className="truncate text-xs text-muted-foreground">{a.detail}</div>
                )}
                <div className="text-[10px] text-muted-foreground/70">by {a.actor}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
