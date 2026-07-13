import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type CatalogEntry = {
  id: string;
  name: string;
  tagline: string;
  category: string;
  logo_slug: string | null;
  status: "live" | "beta" | "coming_soon";
  auth_type: "oauth" | "api_key" | "webhook" | "builtin";
  docs_url: string | null;
  sort_order: number;
};

export type ConnectedAccount = {
  id: string;
  provider: string;
  label: string | null;
  status: string;
  health_status: "healthy" | "degraded" | "error" | "unknown";
  last_sync_at: string | null;
  last_error_msg: string | null;
  mailbox_count: number;
  created_at: string;
};

async function getWorkspaceId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.workspace_id as string | undefined) ?? null;
}

export const listCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ catalog: CatalogEntry[]; requested: string[] }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: catalog, error } = await (context.supabase as any)
      .from("integration_catalog")
      .select("id,name,tagline,category,logo_slug,status,auth_type,docs_url,sort_order")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;

    const workspaceId = await getWorkspaceId(context.supabase, context.userId);
    let requested: string[] = [];
    if (workspaceId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: reqs } = await (context.supabase as any)
        .from("integration_requests")
        .select("provider_id")
        .eq("workspace_id", workspaceId);
      requested = (reqs ?? []).map((r: { provider_id: string }) => r.provider_id);
    }
    return { catalog: (catalog ?? []) as CatalogEntry[], requested };
  });

export const listConnectedAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ accounts: ConnectedAccount[]; oauth: ConnectedAccount[]; builtin: ConnectedAccount[] }> => {
    const workspaceId = await getWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { accounts: [], oauth: [], builtin: [] };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [{ data: ws }, { data: oauth }] = await Promise.all([
      (context.supabase as any)
        .from("workspace_integrations")
        .select("id,provider,label,status,health_status,last_sync_at,last_error_msg,mailbox_count,created_at")
        .eq("workspace_id", workspaceId),
      (context.supabase as any)
        .from("oauth_connections")
        .select("id,provider,account_email,status,last_error,expires_at,created_at")
        .eq("workspace_id", workspaceId),
    ]);

    const accounts: ConnectedAccount[] = (ws ?? []).map((r: {
      id: string; provider: string; label: string | null; status: string;
      health_status: ConnectedAccount["health_status"] | null;
      last_sync_at: string | null; last_error_msg: string | null;
      mailbox_count: number | null; created_at: string;
    }) => ({
      id: r.id,
      provider: r.provider,
      label: r.label,
      status: r.status,
      health_status: r.health_status ?? "unknown",
      last_sync_at: r.last_sync_at,
      last_error_msg: r.last_error_msg,
      mailbox_count: r.mailbox_count ?? 0,
      created_at: r.created_at,
    }));

    const oauthAccounts: ConnectedAccount[] = (oauth ?? []).map((r: {
      id: string; provider: string; account_email: string | null; status: string;
      last_error: string | null; expires_at: string | null; created_at: string;
    }) => ({
      id: r.id,
      provider: r.provider,
      label: r.account_email,
      status: r.status,
      health_status: r.last_error ? "error" : (r.expires_at && new Date(r.expires_at) < new Date() ? "degraded" : "healthy"),
      last_sync_at: null,
      last_error_msg: r.last_error,
      mailbox_count: 1,
      created_at: r.created_at,
    }));

    // Built-in shared integrations (env-key based). Currently: Instantly, gated
    // by allowlisted emails. Surface as a virtual connected account so the
    // owner sees it in the Connected section and stats.
    const builtin: ConnectedAccount[] = [];
    const claimsEmail = (context.claims as { email?: string } | null)?.email?.toLowerCase();
    const allowedEmails = new Set(
      (process.env.INSTANTLY_ALLOWED_EMAILS ?? "anjali@byteback.co.in,abhishek.rathore@byteback.co.in")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
    if (process.env.INSTANTLY_API_KEY && claimsEmail && allowedEmails.has(claimsEmail)) {
      let mailboxCount = 0;
      let health: ConnectedAccount["health_status"] = "healthy";
      let lastError: string | null = null;
      try {
        const res = await fetch("https://api.instantly.ai/api/v2/accounts?limit=100", {
          headers: {
            Authorization: `Bearer ${process.env.INSTANTLY_API_KEY}`,
            Accept: "application/json",
          },
        });
        if (res.ok) {
          const data = (await res.json()) as { items?: unknown[] };
          mailboxCount = Array.isArray(data.items) ? data.items.length : 0;
        } else {
          health = res.status === 401 || res.status === 403 ? "error" : "degraded";
          lastError = `Instantly API returned ${res.status}`;
        }
      } catch (err) {
        health = "degraded";
        lastError = err instanceof Error ? err.message : "Unable to reach Instantly";
      }
      builtin.push({
        id: "instantly-builtin",
        provider: "instantly",
        label: claimsEmail,
        status: "connected",
        health_status: health,
        last_sync_at: null,
        last_error_msg: lastError,
        mailbox_count: mailboxCount,
        created_at: new Date().toISOString(),
      });
    }

    return { accounts, oauth: oauthAccounts, builtin };
  });


const RequestInput = z.object({
  provider_id: z.string().min(1).max(80),
  note: z.string().max(500).optional(),
});
export const requestIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => RequestInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("integration_requests")
      .upsert(
        {
          workspace_id: workspaceId,
          user_id: context.userId,
          provider_id: data.provider_id,
          note: data.note ?? null,
        },
        { onConflict: "workspace_id,provider_id" },
      );
    if (error) throw error;
    return { ok: true as const };
  });

const CancelRequestInput = z.object({ provider_id: z.string() });
export const cancelIntegrationRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => CancelRequestInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { ok: true as const };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (context.supabase as any)
      .from("integration_requests")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("provider_id", data.provider_id);
    return { ok: true as const };
  });

const DisconnectInput = z.object({
  kind: z.enum(["workspace_integration", "oauth_connection"]),
  id: z.string().uuid(),
});
export const disconnectAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DisconnectInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found");
    const table = data.kind === "workspace_integration" ? "workspace_integrations" : "oauth_connections";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from(table)
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return { ok: true as const };
  });
