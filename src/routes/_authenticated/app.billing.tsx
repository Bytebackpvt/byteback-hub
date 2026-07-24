import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getBillingSummary,
  createWorkspacePortalSession,
} from "@/lib/payments.functions";
import { StripeEmbeddedCheckout } from "@/components/stripe-embedded-checkout";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Plan · ByteBack" },
      { name: "description", content: "Manage your ByteBack workspace plan, upgrade, or view invoices." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillingPage,
});

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    tagline: "For founders running outbound alone.",
    monthly: { priceId: "starter_monthly", label: "₹999 / month" },
    yearly: { priceId: "starter_yearly", label: "₹9,990 / year" },
    features: ["3 mailboxes", "5,000 emails / month", "Full AI summary + follow-up engine", "Up to 2 users"],
  },
  {
    key: "pro",
    name: "Pro",
    tagline: "For small teams that live in the inbox.",
    highlight: true,
    monthly: { priceId: "pro_monthly", label: "₹2,499 / month" },
    yearly: { priceId: "pro_yearly", label: "₹24,990 / year" },
    features: ["10 mailboxes", "Unlimited emails", "All integrations", "Full audit log + analytics", "Up to 5 users"],
  },
  {
    key: "business",
    name: "Business",
    tagline: "For agencies and scaling sales orgs.",
    monthly: { priceId: "business_monthly", label: "₹6,999 / month" },
    yearly: { priceId: "business_yearly", label: "₹69,990 / year" },
    features: ["Unlimited mailboxes", "Unlimited team seats", "Custom domain emails", "Priority support"],
  },
];

function BillingPage() {
  const fetchBilling = useServerFn(getBillingSummary);
  const openPortal = useServerFn(createWorkspacePortalSession);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["billing-summary"],
    queryFn: () => fetchBilling(),
  });
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [checkout, setCheckout] = useState<{ priceId: string; workspaceId: string } | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  const plan = data?.planKey ?? "free";
  const isInternal = plan === "internal_unlimited";
  const canManage = data?.role === "owner" || data?.role === "admin";
  const configured = paymentsConfigured();

  async function handlePortal() {
    if (!data?.workspaceId) return;
    setPortalBusy(true);
    try {
      const res = await openPortal({
        data: {
          workspaceId: data.workspaceId,
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/app/billing`,
        },
      });
      if ("error" in res) throw new Error(res.error);
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open billing portal");
    } finally {
      setPortalBusy(false);
    }
  }

  return (
    <div className="min-h-full">
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand" />
          <h1 className="text-2xl font-semibold tracking-tight">Billing & Plan</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your workspace plan, upgrade, or update payment method.
        </p>

        {isLoading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Current plan</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xl font-semibold capitalize">{plan.replace("_", " ")}</span>
                    <Badge variant={isInternal ? "default" : "secondary"}>{data?.status ?? "active"}</Badge>
                  </div>
                  {data?.currentPeriodEnd && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {data.cancelAtPeriodEnd ? "Ends" : "Renews"} on{" "}
                      {new Date(data.currentPeriodEnd).toLocaleDateString()}
                    </div>
                  )}
                  {isInternal && (
                    <div className="mt-2 text-xs text-brand">
                      Internal workspace — unlimited access, forever free.
                    </div>
                  )}
                </div>
                {canManage && data?.hasBillingAccount && !isInternal && (
                  <Button variant="outline" onClick={handlePortal} disabled={portalBusy}>
                    {portalBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                    Manage billing
                  </Button>
                )}
              </div>
            </div>

            {!isInternal && (
              <>
                <div className="mt-8 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Upgrade</h2>
                  <div className="inline-flex rounded-lg border border-border/70 bg-card p-1 text-xs">
                    <button
                      onClick={() => setCycle("monthly")}
                      className={`rounded-md px-3 py-1 ${cycle === "monthly" ? "bg-brand text-brand-foreground" : "text-muted-foreground"}`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setCycle("yearly")}
                      className={`rounded-md px-3 py-1 ${cycle === "yearly" ? "bg-brand text-brand-foreground" : "text-muted-foreground"}`}
                    >
                      Yearly · save ~17%
                    </button>
                  </div>
                </div>

                {!configured && (
                  <div className="mt-4 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                    Payments are not fully configured for this build yet. Checkout will be enabled after go-live.
                  </div>
                )}

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {PLANS.map((p) => {
                    const price = p[cycle];
                    const isCurrent = plan === p.key;
                    return (
                      <div
                        key={p.key}
                        className={`flex flex-col rounded-2xl border p-5 shadow-sm ${p.highlight ? "border-brand/50 ring-1 ring-brand/30 bg-card" : "border-border/70 bg-card"}`}
                      >
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-lg font-semibold">{p.name}</h3>
                          {isCurrent && <Badge>Current</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
                        <div className="mt-3 text-2xl font-semibold tracking-tight">{price.label}</div>
                        <Button
                          disabled={!canManage || isCurrent || !configured}
                          onClick={() =>
                            data?.workspaceId &&
                            setCheckout({ priceId: price.priceId, workspaceId: data.workspaceId })
                          }
                          className="mt-4 w-full"
                          variant={p.highlight ? "default" : "outline"}
                        >
                          {isCurrent ? "Current plan" : `Upgrade to ${p.name}`}
                        </Button>
                        <ul className="mt-4 space-y-2 text-sm">
                          {p.features.map((f) => (
                            <li key={f} className="flex items-start gap-2">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                {!canManage && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Only workspace owners or admins can change the plan.
                  </p>
                )}
              </>
            )}

            <div className="mt-8 text-xs text-muted-foreground">
              Need help? <Link to="/support" className="underline">Contact support</Link>.
            </div>
          </>
        )}
      </div>

      <Dialog
        open={Boolean(checkout)}
        onOpenChange={(o) => {
          if (!o) {
            setCheckout(null);
            refetch();
          }
        }}
      >
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Complete your upgrade</DialogTitle>
          </DialogHeader>
          <div className="p-2">
            {checkout && (
              <StripeEmbeddedCheckout
                workspaceId={checkout.workspaceId}
                priceId={checkout.priceId}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
