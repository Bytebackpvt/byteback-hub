/**
 * Gmail integration - per-user OAuth so ANY end user can connect their
 * Gmail (or Workspace) mailbox and have replies flow into the pipeline.
 *
 * Requires two runtime secrets (added by the workspace owner in Cloud):
 *   GOOGLE_CLIENT_ID       - from Google Cloud Console
 *   GOOGLE_CLIENT_SECRET   - from Google Cloud Console
 *
 * The redirect URI configured in Google Cloud Console must be:
 *   https://<your-app-domain>/api/public/oauth/gmail/callback
 *
 * We poll every mailbox every 5 min via the existing pg_cron -> /api/public/cron/sync
 * route. (Gmail push via Pub/Sub is a future upgrade.)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";
import { syncAllGmail as runAllGmailSync, syncGmailConnection as runGmailConnectionSync } from "@/lib/gmail-sync.server";

/**
 * Build the Google OAuth consent URL. Client passes its window.location.origin
 * so the redirect_uri exactly matches whatever domain the user is on
 * (preview / published / custom).
 */
export const startGmailOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { origin: string }) => z.object({ origin: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return {
        ok: false as const,
        error:
          "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set. Ask the workspace owner to add them in Cloud settings.",
      };
    }
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { ok: false as const, error: "No workspace selected" };

    const state = crypto.randomUUID();
    const gmailScopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "openid",
    ].join(" ");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin as any;
    // Stash the state -> user/workspace mapping so callback can trust it.
    // We reuse sync_state with a synthetic source key.
    await admin.from("sync_state").upsert(
      {
        workspace_id: workspaceId,
        source: `gmail_oauth_state:${state}`,
        cursor: context.userId,
        last_run_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,source" },
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${data.origin.replace(/\/$/, "")}/api/public/oauth/gmail/callback`,
      response_type: "code",
      scope: gmailScopes,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });
    return {
      ok: true as const,
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    };
  });

/** List the current user's connected Gmail accounts (safe, tokens excluded). */
export const listEmailAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return [];
    const { data, error } = await context.supabase
      .from("oauth_connections")
      .select("id, provider, account_email, account_label, status, last_error, scopes, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .eq("provider", "gmail")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const disconnectGmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectionId: string }) => z.object({ connectionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("oauth_connections")
      .delete()
      .eq("id", data.connectionId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const syncGmailConnection = runGmailConnectionSync;

export const syncWorkspaceGmailNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { connections: 0, processed: 0, error: "No workspace" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const { data } = await admin
      .from("oauth_connections")
      .select("id, account_email")
      .eq("workspace_id", workspaceId)
      .eq("provider", "gmail")
      .in("status", ["active", "error"]);
    let processed = 0;
    const errors: Array<{ account: string | null; error: string }> = [];
    for (const row of data ?? []) {
      const result = await runGmailConnectionSync(row.id);
      processed += result.processed;
      if (result.error) errors.push({ account: row.account_email ?? null, error: result.error });
    }
    return { connections: (data ?? []).length, processed, errors };
  });

/** Sync every active Gmail connection across every workspace. */
export const syncAllGmail = runAllGmailSync;
