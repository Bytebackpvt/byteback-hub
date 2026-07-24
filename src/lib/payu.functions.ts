import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";
import {
  buildRequestHash,
  getPayuConfig,
  newTxnId,
  type PayuRequestFields,
} from "@/lib/payu.server";
import { PLANS, getPlanAmount, type BillingCycle, type PlanKey } from "@/lib/payu-plans";

type CheckoutOk = {
  ok: true;
  action: string;
  fields: PayuRequestFields;
  mode: "test" | "production";
};
type CheckoutErr = { ok: false; error: string };

export const createPayuCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      workspaceId: string;
      planKey: PlanKey;
      cycle: BillingCycle;
      origin: string;
    }) => {
      if (!/^[a-f0-9-]{36}$/i.test(data.workspaceId)) throw new Error("Invalid workspaceId");
      if (!PLANS.find((p) => p.key === data.planKey)) throw new Error("Invalid plan");
      if (data.cycle !== "monthly" && data.cycle !== "yearly") throw new Error("Invalid cycle");
      if (!/^https?:\/\//.test(data.origin)) throw new Error("Invalid origin");
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<CheckoutOk | CheckoutErr> => {
    try {
      const { supabase, userId } = context;

      // Verify caller is owner/admin
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("role, workspaces(name)")
        .eq("workspace_id", data.workspaceId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!membership || !["owner", "admin"].includes(membership.role as string)) {
        return { ok: false, error: "Only workspace owners or admins can manage billing." };
      }

      // Block internal_unlimited workspaces
      const { data: sub } = await supabase
        .from("workspace_subscriptions")
        .select("plan_key")
        .eq("workspace_id", data.workspaceId)
        .maybeSingle();
      if ((sub as { plan_key?: string } | null)?.plan_key === "internal_unlimited") {
        return { ok: false, error: "This workspace is on an internal unlimited plan." };
      }

      const { data: userRes } = await supabase.auth.getUser();
      const email = userRes.user?.email ?? "billing@byteback.digital";
      const wsName =
        (membership.workspaces as unknown as { name?: string } | null)?.name ?? "ByteBack user";

      const amount = getPlanAmount(data.planKey, data.cycle).toFixed(2);
      const productinfo = `ByteBack ${data.planKey} (${data.cycle})`;
      const txnid = newTxnId(data.workspaceId);
      const firstname = wsName.slice(0, 40) || "Customer";

      const { key, salt, actionUrl, mode } = getPayuConfig();

      const udf1 = data.workspaceId;
      const udf2 = data.planKey;
      const udf3 = data.cycle;

      const hash = await buildRequestHash({
        key,
        salt,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        udf1,
        udf2,
        udf3,
      });

      const returnBase = `${data.origin}/api/public/payu/return`;

      const fields: PayuRequestFields = {
        key,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone: "9999999999",
        surl: returnBase,
        furl: returnBase,
        hash,
        udf1,
        udf2,
        udf3,
      };

      // Record a pending row so we can reconcile even if PayU webhook lags.
      await (supabase as unknown as {
        from: (t: string) => {
          insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
        };
      })
        .from("payu_payments")
        .insert({
          workspace_id: data.workspaceId,
          txnid,
          plan_key: data.planKey,
          billing_cycle: data.cycle,
          amount,
          status: "initiated",
          mode,
        });

      return { ok: true, action: actionUrl, fields, mode };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Checkout failed" };
    }
  });

export const getBillingSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const wsId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!wsId) return null;
    const { data: sub } = await (context.supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (
            col: string,
            v: string,
          ) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> };
        };
      };
    })
      .from("workspace_subscriptions")
      .select(
        "plan_key, status, current_period_end, billing_cycle, provider, last_payment_at, last_payment_amount",
      )
      .eq("workspace_id", wsId)
      .maybeSingle();
    const { data: mem } = await context.supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", wsId)
      .eq("user_id", context.userId)
      .maybeSingle();
    const planKey = (sub?.plan_key as string) ?? "free";
    const periodEnd = (sub?.current_period_end as string | null) ?? null;
    const expired = periodEnd ? new Date(periodEnd).getTime() < Date.now() : false;
    return {
      workspaceId: wsId,
      planKey,
      status: (sub?.status as string) ?? "active",
      billingCycle: (sub?.billing_cycle as string | null) ?? null,
      provider: (sub?.provider as string | null) ?? "payu",
      currentPeriodEnd: periodEnd,
      lastPaymentAt: (sub?.last_payment_at as string | null) ?? null,
      lastPaymentAmount: (sub?.last_payment_amount as number | null) ?? null,
      expired,
      role: (mem?.role as string) ?? null,
    };
  });
