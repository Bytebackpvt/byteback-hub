import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBillingSummary, createPayuCheckout } from "@/lib/payu.functions";
import { PLANS, type BillingCycle, type PlanKey } from "@/lib/payu-plans";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Plan · ByteBack" },
      {
        name: "description",
        content: "Manage your ByteBack workspace plan or upgrade with PayU.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const fetchBilling = useServerFn(getBillingSummary);
  const startCheckout = useServerFn(createPayuCheckout);
  const { data, isLoading } = useQuery({
    queryKey: ["billing-summary"],
    queryFn: () => fetchBilling(),
  });
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [busyPlan, setBusyPlan] = useState<PlanKey | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const plan = data?.planKey ?? "free";
  const isInternal = plan === "internal_unlimited";
  const canManage = data?.role === "owner" || data?.role === "admin";

  async function handleUpgrade(planKey: PlanKey) {
    if (!data?.workspaceId) return;
    setBusyPlan(planKey);
    try {
      const res = await startCheckout({
        data: {
          workspaceId: data.workspaceId,
          planKey,
          cycle,
          origin: window.location.origin,
        },
      });
      if (!res.ok) throw new Error(res.error);
      // Build a hidden form and submit to PayU. This navigates the browser
      // away from the app to PayU's hosted checkout page.
      const form = document.createElement("form");
      form.method = "POST";
      form.action = res.action;
      form.style.display = "none";
      for (const [k, v] of Object.entries(res.fields)) {
        if (v === undefined) continue;
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = String(v);
        form.appendChild(input);
      }
      document.body.appendChild(form);
      formRef.current = form;
      form.submit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
      setBusyPlan(null);
    }
  }

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand" />
          <h1 className="text-2xl font-semibold tracking-tight">Billing & Plan</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your workspace plan or upgrade with a one-time PayU payment.
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
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Current plan
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xl font-semibold capitalize">
                      {plan.replace("_", " ")}
                    </span>
                    <Badge variant={isInternal ? "default" : "secondary"}>
                      {data?.expired ? "expired" : (data?.status ?? "active")}
                    </Badge>
                    {data?.billingCycle && !isInternal && (
                      <Badge variant="outline">{data.billingCycle}</Badge>
                    )}
                  </div>
                  {data?.currentPeriodEnd && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {data.expired ? "Expired on" : "Valid until"}{" "}
                      {new Date(data.currentPeriodEnd).toLocaleDateString()}
                    </div>
                  )}
                  {data?.lastPaymentAt && data.lastPaymentAmount && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Last payment: ₹{Number(data.lastPaymentAmount).toLocaleString("en-IN")} on{" "}
                      {new Date(data.lastPaymentAt).toLocaleDateString()}
                    </div>
                  )}
                  {isInternal && (
                    <div className="mt-2 text-xs text-brand">
                      Internal workspace — unlimited access, forever free.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!isInternal && (
              <>
                <div className="mt-8 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {data?.expired || plan === "free" ? "Choose a plan" : "Renew or upgrade"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      One-time payment via PayU — activates instantly, valid for{" "}
                      {cycle === "yearly" ? "1 year" : "30 days"}.
                    </p>
                  </div>
                  <div className="inline-flex rounded-lg border border-border/70 bg-card p-1 text-xs">
                    <button
                      onClick={() => setCycle("monthly")}
                      className={`rounded-md px-3 py-1 ${
                        cycle === "monthly"
                          ? "bg-brand text-brand-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setCycle("yearly")}
                      className={`rounded-md px-3 py-1 ${
                        cycle === "yearly"
                          ? "bg-brand text-brand-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      Yearly · save ~17%
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {PLANS.map((p) => {
                    const price = p[cycle];
                    const isCurrent = plan === p.key && !data?.expired;
                    return (
                      <div
                        key={p.key}
                        className={`flex flex-col rounded-2xl border p-5 shadow-sm ${
                          p.highlight
                            ? "border-brand/50 ring-1 ring-brand/30 bg-card"
                            : "border-border/70 bg-card"
                        }`}
                      >
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-lg font-semibold">{p.name}</h3>
                          {isCurrent && <Badge>Current</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
                        <div className="mt-3 text-2xl font-semibold tracking-tight">
                          {price.label}
                        </div>
                        <Button
                          disabled={!canManage || busyPlan !== null}
                          onClick={() => handleUpgrade(p.key)}
                          className="mt-4 w-full"
                          variant={p.highlight ? "default" : "outline"}
                        >
                          {busyPlan === p.key ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isCurrent ? (
                            `Renew ${p.name}`
                          ) : (
                            `Choose ${p.name}`
                          )}
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
              Payments are processed securely by PayU India. Need help?{" "}
              <Link to="/support" className="underline">
                Contact support
              </Link>
              .
            </div>
          </>
        )}
      </div>
    </div>
  );
}
