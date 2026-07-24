import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

// Map price lookup_key -> plan_key
function planFromLookup(lookup: string | null | undefined): string {
  if (!lookup) return "free";
  if (lookup.startsWith("starter")) return "starter";
  if (lookup.startsWith("pro")) return "pro";
  if (lookup.startsWith("business")) return "business";
  return "free";
}

async function upsertFromSubscription(sub: any, env: StripeEnv) {
  const workspaceId = sub.metadata?.workspaceId;
  if (!workspaceId) {
    console.error("[payments-webhook] no workspaceId on subscription", sub.id);
    return;
  }
  const item = sub.items?.data?.[0];
  const priceLookup: string | undefined =
    item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;

  const isActive = ["active", "trialing", "past_due"].includes(sub.status);
  const nextPlan = isActive || sub.status === "canceled"
    ? planFromLookup(priceLookup)
    : "free";

  // Never demote internal_unlimited
  const { data: current } = await getSupabase()
    .from("workspace_subscriptions")
    .select("plan_key")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const currentPlan = (current as { plan_key?: string } | null)?.plan_key;
  if (currentPlan === "internal_unlimited") {
    console.log("[payments-webhook] skipping update for internal_unlimited workspace", workspaceId);
    return;
  }

  await getSupabase().from("workspace_subscriptions").upsert(
    [{
      workspace_id: workspaceId,
      plan_key: sub.status === "canceled" && periodEnd
        ? nextPlan // still active until period_end
        : isActive
          ? nextPlan
          : "free",
      status: sub.status,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
      stripe_subscription_id: sub.id,
      price_id: priceLookup ?? null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: Boolean(sub.cancel_at_period_end),
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" },
  );
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await upsertFromSubscription(event.data.object as any, env);
      break;
    default:
      console.log("[payments-webhook] unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[payments-webhook] error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
