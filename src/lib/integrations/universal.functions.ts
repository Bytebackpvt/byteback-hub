// Universal integration server functions. All provider I/O flows through here.
// Adding a new provider = add to registry.ts and (optionally) add a test/sync
// adapter in the maps below. No new server fns and no new UI code required.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PROVIDER_REGISTRY, getProvider, type ProviderEntry } from "@/lib/integrations/registry";

async function getWorkspaceId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.workspace_id as string | undefined) ?? null;
}

/* =====================================================================
   List — returns registry + connection status for the current workspace
   ===================================================================== */

export type IntegrationListRow = {
  provider_id: string;
  connection_id: string | null;
  status: "not_connected" | "connected" | "error" | "disabled";
  health: "healthy" | "degraded" | "error" | "unknown";
  label: string | null;
  last_sync_at: string | null;
  last_error_msg: string | null;
  config_public: Record<string, unknown>;
};

export const listAllIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getWorkspaceId(context.supabase, context.userId);
    const registry = PROVIDER_REGISTRY;
    if (!workspaceId) {
      return {
        registry,
        rows: registry.map<IntegrationListRow>((p) => ({
          provider_id: p.id,
          connection_id: null,
          status: "not_connected",
          health: "unknown",
          label: null,
          last_sync_at: null,
          last_error_msg: null,
          config_public: {},
        })),
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (context.supabase as any)
      .from("workspace_integrations")
      .select("id, provider, status, label, config, health_status, last_sync_at, last_error_msg")
      .eq("workspace_id", workspaceId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: oauth } = await (context.supabase as any)
      .from("oauth_connections")
      .select("id, provider, account_email, status, expires_at, last_error")
      .eq("workspace_id", workspaceId);

    const byProvider = new Map<string, IntegrationListRow>();
    for (const r of (data ?? []) as Array<{
      id: string;
      provider: string;
      status: string;
      label: string | null;
      config: Record<string, unknown> | null;
      health_status: string | null;
      last_sync_at: string | null;
      last_error_msg: string | null;
    }>) {
      byProvider.set(r.provider, {
        provider_id: r.provider,
        connection_id: r.id,
        status: (r.status as IntegrationListRow["status"]) ?? "connected",
        health:
          (r.health_status as IntegrationListRow["health"]) ??
          (r.status === "error" ? "error" : "healthy"),
        label: r.label,
        last_sync_at: r.last_sync_at,
        last_error_msg: r.last_error_msg,
        config_public: sanitizeConfig(r.config ?? {}),
      });
    }
    // Fold gmail oauth into the "gmail" registry entry
    for (const o of (oauth ?? []) as Array<{
      id: string;
      provider: string;
      account_email: string | null;
      status: string;
      expires_at: string | null;
      last_error: string | null;
    }>) {
      const key = o.provider === "google" ? "gmail" : o.provider;
      if (byProvider.has(key)) continue;
      byProvider.set(key, {
        provider_id: key,
        connection_id: o.id,
        status: o.status === "revoked" ? "disabled" : (o.last_error ? "error" : "connected"),
        health: o.last_error ? "error" : "healthy",
        label: o.account_email,
        last_sync_at: null,
        last_error_msg: o.last_error,
        config_public: {},
      });
    }

    const rows: IntegrationListRow[] = registry.map((p) =>
      byProvider.get(p.id) ?? {
        provider_id: p.id,
        connection_id: null,
        status: "not_connected",
        health: "unknown",
        label: null,
        last_sync_at: null,
        last_error_msg: null,
        config_public: {},
      },
    );
    return { registry, rows };
  });

function sanitizeConfig(config: Record<string, unknown>): Record<string, unknown> {
  // Drop any accidentally-stored secret-looking values.
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    if (typeof v === "string" && /(secret|token|api[_-]?key)/i.test(k)) continue;
    out[k] = v;
  }
  return out;
}

/* =====================================================================
   Connect — generic form → validate → encrypt → upsert row → test
   ===================================================================== */

const ConnectInput = z.object({
  provider: z.string().min(1).max(60),
  fields: z.record(z.string(), z.string().max(4000)).default({}),
});

export const connectIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ConnectInput.parse(raw))
  .handler(async ({ data, context }) => {
    const provider = getProvider(data.provider);
    if (!provider) throw new Error("Unknown provider");
    if (provider.auth_kind === "oauth" || provider.auth_kind === "webhook_in") {
      throw new Error("This provider does not use a form-based connect flow.");
    }

    // Validate required fields
    for (const f of provider.fields) {
      if (f.required && !(data.fields[f.key] ?? "").trim()) {
        throw new Error(`${f.label} is required`);
      }
      const v = data.fields[f.key];
      if (v && f.type === "url" && !/^https?:\/\//i.test(v)) {
        throw new Error(`${f.label} must be a valid URL`);
      }
    }

    const workspaceId = await getWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found");

    // Split secrets vs public config
    const publicConfig: Record<string, string> = {};
    let secretPayload: Record<string, string> = {};
    for (const f of provider.fields) {
      const v = data.fields[f.key];
      if (!v) continue;
      if (f.secret) secretPayload[f.key] = v;
      else publicConfig[f.key] = v;
    }

    let encryptedSecret: string | null = null;
    if (Object.keys(secretPayload).length > 0) {
      const { encryptSecret } = await import("@/lib/integrations/crypto.server");
      // If only one secret field with the common "webhook_url"/"api_key" key,
      // store its raw value so existing helpers (Slack/Teams/Discord webhook
      // POST, Instantly key lookup) keep working. Otherwise JSON-encode.
      const keys = Object.keys(secretPayload);
      const payload = keys.length === 1 ? secretPayload[keys[0]] : JSON.stringify(secretPayload);
      encryptedSecret = await encryptSecret(payload);
      // For webhook providers we historically stored plain URL in `secret`.
      // Keep that shape so testIntegration + existing dispatcher work.
      if (provider.auth_kind === "webhook_out" && keys[0] === "webhook_url") {
        encryptedSecret = payload; // plaintext URL — non-sensitive, used directly
      }
    }
    // suppress lint for unused reassignment noise
    secretPayload = {};

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("workspace_integrations")
      .upsert(
        {
          workspace_id: workspaceId,
          provider: provider.id,
          status: "connected",
          label: publicConfig.channel_label || publicConfig.label || null,
          config: publicConfig,
          secret: encryptedSecret,
          created_by: context.userId,
          health_status: "unknown",
          last_error_msg: null,
        },
        { onConflict: "workspace_id,provider" },
      );
    if (error) throw error;

    // Fire a test right after connecting so the user gets immediate feedback.
    try {
      await runProviderTest(provider, publicConfig, secretPayload_or_decrypt(publicConfig, data.fields, provider));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Test failed";
      // Mark degraded but keep the connection so user can edit
      await (supabaseAdmin as unknown as SupabaseClient<Database>)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("workspace_integrations" as any)
        .update({ health_status: "degraded", last_error_msg: msg })
        .eq("workspace_id", workspaceId)
        .eq("provider", provider.id);
      return { ok: true as const, tested: false, warning: msg };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("workspace_integrations")
      .update({ health_status: "healthy", last_error_msg: null })
      .eq("workspace_id", workspaceId)
      .eq("provider", provider.id);
    return { ok: true as const, tested: true };
  });

// helper: for the immediate post-connect test, use the plaintext fields the
// user just typed rather than round-tripping through decrypt.
function secretPayload_or_decrypt(
  _publicConfig: Record<string, string>,
  rawFields: Record<string, string>,
  provider: ProviderEntry,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of provider.fields) if (f.secret && rawFields[f.key]) out[f.key] = rawFields[f.key];
  return out;
}

/* =====================================================================
   Test — validate credentials via provider adapter
   ===================================================================== */

const TestInput = z.object({ provider: z.string().min(1).max(60) });

export const testIntegrationUniversal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => TestInput.parse(raw))
  .handler(async ({ data, context }) => {
    const provider = getProvider(data.provider);
    if (!provider) throw new Error("Unknown provider");
    const workspaceId = await getWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row } = await (supabaseAdmin as any)
      .from("workspace_integrations")
      .select("config, secret")
      .eq("workspace_id", workspaceId)
      .eq("provider", provider.id)
      .maybeSingle();
    if (!row) throw new Error("Not connected");

    const secrets = await decodeSecrets(provider, row.secret as string | null);
    try {
      await runProviderTest(provider, (row.config ?? {}) as Record<string, string>, secrets);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from("workspace_integrations")
        .update({ health_status: "healthy", last_error_msg: null })
        .eq("workspace_id", workspaceId)
        .eq("provider", provider.id);
      return { ok: true as const };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Test failed";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from("workspace_integrations")
        .update({ health_status: "degraded", last_error_msg: msg })
        .eq("workspace_id", workspaceId)
        .eq("provider", provider.id);
      throw new Error(msg);
    }
  });

/* =====================================================================
   Disconnect
   ===================================================================== */

const DisconnectInput = z.object({ provider: z.string().min(1).max(60) });

export const disconnectIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DisconnectInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { ok: true as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("workspace_integrations")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("provider", data.provider);
    return { ok: true as const };
  });

/* =====================================================================
   Adapters — per-provider test/sync logic
   ===================================================================== */

async function decodeSecrets(
  provider: ProviderEntry,
  stored: string | null,
): Promise<Record<string, string>> {
  if (!stored) return {};
  const secretFields = provider.fields.filter((f) => f.secret);
  if (secretFields.length === 0) return {};

  // webhook_out providers store plain URLs
  if (provider.auth_kind === "webhook_out" && secretFields.length === 1) {
    return { [secretFields[0].key]: stored };
  }

  try {
    const { decryptSecret } = await import("@/lib/integrations/crypto.server");
    const dec = await decryptSecret(stored);
    if (secretFields.length === 1) return { [secretFields[0].key]: dec };
    try {
      const parsed = JSON.parse(dec) as Record<string, string>;
      return parsed;
    } catch {
      return { [secretFields[0].key]: dec };
    }
  } catch {
    // Legacy row where the URL/key was stored plaintext
    if (secretFields.length === 1) return { [secretFields[0].key]: stored };
    return {};
  }
}

async function runProviderTest(
  provider: ProviderEntry,
  config: Record<string, string>,
  secrets: Record<string, string>,
): Promise<void> {
  switch (provider.id) {
    case "instantly": {
      const key = secrets.api_key;
      if (!key) throw new Error("API key missing");
      const res = await fetch("https://api.instantly.ai/api/v2/accounts?limit=1", {
        headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Instantly returned ${res.status}`);
      return;
    }
    case "smartlead": {
      const key = secrets.api_key;
      if (!key) throw new Error("API key missing");
      const res = await fetch(
        `https://server.smartlead.ai/api/v1/campaigns?api_key=${encodeURIComponent(key)}`,
      );
      if (!res.ok) throw new Error(`Smartlead returned ${res.status}`);
      return;
    }
    case "apollo": {
      const key = secrets.api_key;
      if (!key) throw new Error("API key missing");
      const res = await fetch("https://api.apollo.io/v1/auth/health", {
        headers: { "Cache-Control": "no-cache", "X-Api-Key": key },
      });
      if (!res.ok) throw new Error(`Apollo returned ${res.status}`);
      return;
    }
    case "hubspot": {
      const key = secrets.api_key;
      if (!key) throw new Error("API key missing");
      const res = await fetch(
        "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
        { headers: { Authorization: `Bearer ${key}` } },
      );
      if (!res.ok) throw new Error(`HubSpot returned ${res.status}`);
      return;
    }
    case "pipedrive": {
      const key = secrets.api_key;
      const domain = config.company_domain;
      if (!key || !domain) throw new Error("API token and company domain required");
      const res = await fetch(
        `https://${encodeURIComponent(domain)}.pipedrive.com/api/v1/users/me?api_token=${encodeURIComponent(key)}`,
      );
      if (!res.ok) throw new Error(`Pipedrive returned ${res.status}`);
      return;
    }
    case "slack":
    case "microsoft_teams":
    case "discord":
    case "zapier":
    case "generic_webhook":
    case "make":
    case "n8n": {
      const url = secrets.webhook_url;
      if (!url) throw new Error("Webhook URL missing");
      const msg = "✅ ByteBack test — this endpoint is now connected.";
      const body =
        provider.id === "discord"
          ? JSON.stringify({ content: msg })
          : provider.id === "slack" || provider.id === "microsoft_teams"
            ? JSON.stringify({ text: msg })
            : JSON.stringify({
                event: "byteback.test",
                message: msg,
                ts: new Date().toISOString(),
              });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!res.ok) throw new Error(`Endpoint returned ${res.status}`);
      return;
    }
    default:
      // Unknown adapter — treat as passthrough (row is saved, no test).
      return;
  }
}
