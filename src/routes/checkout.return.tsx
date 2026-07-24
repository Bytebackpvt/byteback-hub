import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>) => ({
    status: typeof search.status === "string" ? search.status : "unknown",
    txnid: typeof search.txnid === "string" ? search.txnid : undefined,
    plan: typeof search.plan === "string" ? search.plan : undefined,
    message: typeof search.message === "string" ? search.message : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Payment status · ByteBack" },
      { name: "description", content: "Your ByteBack workspace payment status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { status, txnid, plan, message } = Route.useSearch();
  const success = status === "success";
  const failed = status === "failure";
  const invalid = status === "invalid";

  const Icon = success ? CheckCircle2 : failed ? XCircle : AlertCircle;
  const iconColor = success ? "text-brand" : failed ? "text-destructive" : "text-amber-500";
  const title = success
    ? "Payment received"
    : failed
      ? "Payment failed"
      : invalid
        ? "Verification failed"
        : "Payment status pending";

  const body = success
    ? `Your workspace has been upgraded${plan ? ` to the ${plan} plan` : ""}. Reference: ${txnid ?? "n/a"}.`
    : failed
      ? message ?? "The payment could not be completed. No amount was charged, or it will be refunded automatically."
      : invalid
        ? "We could not verify this payment response. If money was deducted, it will be auto-refunded within 5–7 business days."
        : "We're still confirming the payment status. Check your billing page in a minute.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center rounded-2xl border border-border/70 bg-card p-8 shadow-sm">
        <Icon className={`mx-auto h-12 w-12 ${iconColor}`} />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link to="/app/billing">
            <Button className="w-full" variant={success ? "default" : "outline"}>
              Go to billing
            </Button>
          </Link>
          {!success && (
            <Link to="/app/dashboard">
              <Button className="w-full" variant="ghost">
                Back to dashboard
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
