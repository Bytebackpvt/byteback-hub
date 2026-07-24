// Shared handler for PayU SURL/FURL redirects AND the server-to-server webhook.
// Verifies the response hash, upserts workspace_subscriptions when the payment
// succeeded, and records the raw transaction in payu_payments.

import { getPayuConfig, verifyResponseHash } from "@/lib/payu.server";

type Result = {
  status: "success" | "failure" | "invalid";
  workspaceId?: string;
  planKey?: string;
  txnid?: string;
  message?: string;
};

function addPeriod(cycle: string): string {
  const now = new Date();
  if (cycle === "yearly") now.setFullYear(now.getFullYear() + 1);
  else now.setMonth(now.getMonth() + 1);
  return now.toISOString();
}

export async function handlePayuCallback(request: Request): Promise<Result> {
  const contentType = request.headers.get("content-type") ?? "";
  let form: Record<string, string> = {};

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const raw = await request.text();
    for (const [k, v] of new URLSearchParams(raw).entries()) form[k] = v;
  } else if (contentType.includes("multipart/form-data")) {
    const fd = await request.formData();
    fd.forEach((v, k) => (form[k] = String(v)));
  } else {
    // Fallback — try both
    try {
      const raw = await request.clone().text();
      for (const [k, v] of new URLSearchParams(raw).entries()) form[k] = v;
    } catch {
      /* ignore */
    }
  }

  const { salt } = getPayuConfig();
  const valid = await verifyResponseHash(form, salt);
  if (!valid) return { status: "invalid", message: "Hash mismatch" };

  const workspaceId = form.udf1;
  const planKey = form.udf2;
  const cycle = form.udf3;
  const txnid = form.txnid;
  const payuStatus = (form.status ?? "").toLowerCase();
  const succeeded = payuStatus === "success";

  const { createClient } = await import("@supabase/supabase-js");
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Record raw payment
  if (workspaceId && txnid) {
    await (supabaseAdmin as unknown as {
      from: (t: string) => {
        upsert: (
          row: Record<string, unknown>,
          o: { onConflict: string },
        ) => Promise<{ error: unknown }>;
      };
    })
      .from("payu_payments")
      .upsert(
        {
          workspace_id: workspaceId,
          txnid,
          mihpayid: form.mihpayid ?? null,
          plan_key: planKey ?? "unknown",
          billing_cycle: cycle ?? "monthly",
          amount: Number(form.amount ?? 0),
          status: payuStatus || "unknown",
          mode: form.mode ?? null,
          raw: form,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "txnid" },
      );
  }

  if (!succeeded || !workspaceId || !planKey) {
    return {
      status: succeeded ? "success" : "failure",
      workspaceId,
      planKey,
      txnid,
      message: form.error_Message ?? form.error ?? undefined,
    };
  }

  // Don't override internal_unlimited
  const { data: current } = await (supabaseAdmin as unknown as {
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
    .select("plan_key")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if ((current as { plan_key?: string } | null)?.plan_key === "internal_unlimited") {
    return { status: "success", workspaceId, planKey, txnid };
  }

  await (supabaseAdmin as unknown as {
    from: (t: string) => {
      upsert: (
        row: Record<string, unknown>,
        o: { onConflict: string },
      ) => Promise<{ error: unknown }>;
    };
  })
    .from("workspace_subscriptions")
    .upsert(
      {
        workspace_id: workspaceId,
        plan_key: planKey,
        status: "active",
        provider: "payu",
        billing_cycle: cycle ?? "monthly",
        current_period_end: addPeriod(cycle ?? "monthly"),
        payu_txn_id: txnid,
        payu_mihpayid: form.mihpayid ?? null,
        last_payment_amount: Number(form.amount ?? 0),
        last_payment_at: new Date().toISOString(),
        environment: getPayuConfig().mode === "production" ? "live" : "sandbox",
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" },
    );

  return { status: "success", workspaceId, planKey, txnid };
}
