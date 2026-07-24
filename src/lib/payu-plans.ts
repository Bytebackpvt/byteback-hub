// Client-safe plan catalogue for PayU one-time purchases.
// Amounts are in INR. Duration determines how far current_period_end is
// pushed forward on a successful payment.

export type BillingCycle = "monthly" | "yearly";
export type PlanKey = "starter" | "pro" | "business";

export type PlanPricing = {
  key: PlanKey;
  name: string;
  tagline: string;
  highlight?: boolean;
  features: string[];
  monthly: { amount: number; label: string };
  yearly: { amount: number; label: string };
};

export const PLANS: PlanPricing[] = [
  {
    key: "starter",
    name: "Starter",
    tagline: "For founders running outbound alone.",
    features: [
      "3 mailboxes",
      "5,000 emails / month",
      "Full AI summary + follow-up engine",
      "Up to 2 users",
    ],
    monthly: { amount: 999, label: "₹999 / month" },
    yearly: { amount: 9990, label: "₹9,990 / year" },
  },
  {
    key: "pro",
    name: "Pro",
    tagline: "For small teams that live in the inbox.",
    highlight: true,
    features: [
      "10 mailboxes",
      "Unlimited emails",
      "All integrations",
      "Full audit log + analytics",
      "Up to 5 users",
    ],
    monthly: { amount: 2499, label: "₹2,499 / month" },
    yearly: { amount: 24990, label: "₹24,990 / year" },
  },
  {
    key: "business",
    name: "Business",
    tagline: "For agencies and scaling sales orgs.",
    features: [
      "Unlimited mailboxes",
      "Unlimited team seats",
      "Custom domain emails",
      "Priority support",
    ],
    monthly: { amount: 6999, label: "₹6,999 / month" },
    yearly: { amount: 69990, label: "₹69,990 / year" },
  },
];

export function findPlan(key: string): PlanPricing | undefined {
  return PLANS.find((p) => p.key === key);
}

export function getPlanAmount(key: PlanKey, cycle: BillingCycle): number {
  const plan = PLANS.find((p) => p.key === key);
  if (!plan) throw new Error("Unknown plan");
  return cycle === "yearly" ? plan.yearly.amount : plan.monthly.amount;
}
