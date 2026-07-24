import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Payment complete · ByteBack" },
      { name: "description", content: "Your ByteBack workspace has been upgraded." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center rounded-2xl border border-border/70 bg-card p-8 shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Payment received</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {session_id
            ? "Your workspace plan is being upgraded. It usually takes a few seconds."
            : "Something went wrong reading the session id, but if you completed payment your plan will update shortly."}
        </p>
        <Link to="/app/dashboard" className="block mt-6">
          <Button className="w-full">Go to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
