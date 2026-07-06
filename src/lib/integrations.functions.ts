import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type IntegrationProvider =
  | "slack_webhook"
  | "gmail"
  | "outlook"
  | "hubspot"
  | "zapier_webhook";

export type IntegrationRow = {
  id: string;
  provider: IntegrationProvider;
  status: "connected" | "error" | "disabled";
  label: string | null;
  created_at: string;
  updated_at: string;
  // config is safe to send to the client; secret is not
  config: Record<string, string | number | boolean | null>;
  has_secret: boolean;
};

async function getOwnedWorkspaceId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.id as string | undefined) ?? null;
}

export const listIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { integrations: [] as IntegrationRow[] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any)
      .from("workspace_integrations")
      .select("id, provider, status, label, config, secret, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      id: string;
      provider: IntegrationProvider;
      status: IntegrationRow["status"];
      label: string | null;
      config: Record<string, string | number | boolean | null> | null;
      secret: string | null;
      created_at: string;
      updated_at: string;
    }>;
    return {
      integrations: rows.map((r) => ({
        id: r.id,
        provider: r.provider,
        status: r.status,
        label: r.label,
        config: r.config ?? {},
        has_secret: !!r.secret,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
    };
  });

const SaveInput = z.object({
  provider: z.enum(["slack_webhook", "zapier_webhook"] as const),
  label: z.string().max(120).optional(),
  webhook_url: z.string().url(),
});

export const saveWebhookIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SaveInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("workspace_integrations")
      .upsert(
        {
          workspace_id: workspaceId,
          provider: data.provider,
          status: "connected",
          label: data.label ?? null,
          config: {},
          secret: data.webhook_url,
          created_by: context.userId,
        },
        { onConflict: "workspace_id,provider" },
      );
    if (error) throw error;
    return { ok: true as const };
  });

const DeleteInput = z.object({ id: z.string().uuid() });
export const deleteIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DeleteInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { ok: true as const };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("workspace_integrations")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

const TestInput = z.object({ id: z.string().uuid() });
export const testIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => TestInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase as any)
      .from("workspace_integrations")
      .select("provider, secret")
      .eq("workspace_id", workspaceId)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!row?.secret) throw new Error("Integration not found or missing webhook URL");

    if (row.provider === "slack_webhook") {
      const res = await fetch(row.secret as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "✅ ByteBack Inbox test — this channel is now connected and will receive lead alerts.",
        }),
      });
      if (!res.ok) throw new Error(`Slack rejected the webhook (${res.status})`);
    } else if (row.provider === "zapier_webhook") {
      const res = await fetch(row.secret as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "byteback.test",
          message: "ByteBack Inbox test event",
          ts: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(`Zapier rejected the webhook (${res.status})`);
    }
    return { ok: true as const };
  });
