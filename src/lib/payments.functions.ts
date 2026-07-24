import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

type CheckoutResult = { clientSecret: string } | { error: string };

/**
 * Look up or create a Stripe Customer scoped to a workspace.
 * We use metadata.workspaceId (not userId) because subscriptions belong to
 * the workspace, not the individual member.
 */
async function resolveWorkspaceCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { workspaceId: string; email?: string; name?: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9-]+$/.test(options.workspaceId)) {
    throw new Error("Invalid workspaceId");
  }
  const found = await stripe.customers.search({
    query: `metadata['workspaceId']:'${options.workspaceId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;

  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.name && { name: options.name }),
    metadata: { workspaceId: options.workspaceId },
  });
  return created.id;
}

export const createWorkspaceCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      workspaceId: string;
      priceId: string;
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
      if (!/^[a-zA-Z0-9-]+$/.test(data.workspaceId)) throw new Error("Invalid workspaceId");
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { supabase, userId } = context;

      // Verify caller is owner/admin of this workspace and get workspace name
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("role, workspaces(id, name)")
        .eq("workspace_id", data.workspaceId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!membership || !["owner", "admin"].includes(membership.role as string)) {
        return { error: "Only workspace owners or admins can manage billing." };
      }

      // Block internal_unlimited workspaces from paying
      const { data: sub } = await supabase
        .from("workspace_subscriptions")
        .select("plan_key")
        .eq("workspace_id", data.workspaceId)
        .maybeSingle();
      if (sub?.plan_key === "internal_unlimited") {
        return { error: "This workspace is on an internal unlimited plan." };
      }

      const { data: userRes } = await supabase.auth.getUser();
      const email = userRes.user?.email ?? undefined;
      const wsName = (membership.workspaces as unknown as { name?: string } | null)?.name;

      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) return { error: "Price not found" };
      const stripePrice = prices.data[0];
      const isRecurring = stripePrice.type === "recurring";

      const customerId = await resolveWorkspaceCustomer(stripe, {
        workspaceId: data.workspaceId,
        email,
        name: wsName,
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        automatic_tax: { enabled: true },
        metadata: { workspaceId: data.workspaceId, userId },
        ...(isRecurring && {
          subscription_data: {
            metadata: { workspaceId: data.workspaceId, userId },
          },
        }),
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createWorkspacePortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { workspaceId: string; returnUrl?: string; environment: StripeEnv }) => data,
  )
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { supabase, userId } = context;
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership || !["owner", "admin"].includes(membership.role as string)) {
      return { error: "Only workspace owners or admins can manage billing." };
    }
    const { data: sub } = await supabase
      .from("workspace_subscriptions")
      .select("stripe_customer_id, plan_key")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    if (!sub?.stripe_customer_id) return { error: "No billing account yet. Upgrade first." };
    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
