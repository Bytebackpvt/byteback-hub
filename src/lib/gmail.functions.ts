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

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

function callbackFor(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/public/oauth/gmail/callback`;
}

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
      redirect_uri: callbackFor(data.origin),
      response_type: "code",
      scope: GMAIL_SCOPES,
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
    const { data, error } = await context.supabase
      .from("oauth_connections")
      .select("id, provider, account_email, account_label, status, last_error, scopes, created_at, updated_at")
      .eq("user_id", context.userId)
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

/* ============= Gmail sync (called by cron) ============= */

type GmailListItem = { id: string; threadId?: string };
type GmailHeader = { name: string; value: string };
type GmailMessage = {
  id: string;
  threadId?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailHeader[];
    mimeType?: string;
    body?: { data?: string };
    parts?: Array<{
      mimeType?: string;
      body?: { data?: string };
      parts?: Array<{ mimeType?: string; body?: { data?: string } }>;
    }>;
  };
};

function decodeB64Url(s: string): string {
  try {
    return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return "";
  }
}

function headerVal(msg: GmailMessage, name: string): string {
  const h = msg.payload?.headers?.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

function extractBody(msg: GmailMessage): { text: string; html: string } {
  const out = { text: "", html: "" };
  const walk = (p: NonNullable<GmailMessage["payload"]> | NonNullable<NonNullable<GmailMessage["payload"]>["parts"]>[number]) => {
    if (!p) return;
    if (p.body?.data) {
      const decoded = decodeB64Url(p.body.data);
      if (p.mimeType === "text/plain" && !out.text) out.text = decoded;
      else if (p.mimeType === "text/html" && !out.html) out.html = decoded;
    }
    if ("parts" in p && p.parts) for (const c of p.parts) walk(c);
  };
  if (msg.payload) walk(msg.payload);
  return out;
}

function parseFrom(raw: string): { email: string; name: string } {
  const m = raw.match(/^(.*?)<([^>]+)>$/);
  if (m) return { name: m[1].replace(/["']/g, "").trim(), email: m[2].trim().toLowerCase() };
  return { name: "", email: raw.trim().toLowerCase() };
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Sync one Gmail connection. Fetches INBOX messages since last cursor
 * (Gmail historyId or internalDate) and pushes each through ingestEmail.
 */
export async function syncGmailConnection(connectionId: string): Promise<{
  processed: number;
  skipped: number;
  error?: string;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { ingestEmail, decryptToken, encryptToken, stripHtml } = await import("@/lib/email-ingest.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;

  const { data: conn, error: connErr } = await admin
    .from("oauth_connections")
    .select("*")
    .eq("id", connectionId)
    .maybeSingle();
  if (connErr || !conn) return { processed: 0, skipped: 0, error: "connection not found" };

  // Decrypt access token; refresh if expired.
  let accessToken = "";
  try {
    if (conn.access_token_enc) accessToken = await decryptToken(conn.access_token_enc);
  } catch {
    accessToken = "";
  }
  const expired = !conn.expires_at || new Date(conn.expires_at).getTime() < Date.now() + 30_000;
  if (expired && conn.refresh_token_enc) {
    try {
      const rt = await decryptToken(conn.refresh_token_enc);
      const refreshed = await refreshAccessToken(rt);
      if (refreshed) {
        accessToken = refreshed.access_token;
        const enc = await encryptToken(refreshed.access_token);
        await admin
          .from("oauth_connections")
          .update({
            access_token_enc: enc,
            expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            status: "active",
            last_error: null,
          })
          .eq("id", connectionId);
      }
    } catch (e) {
      await admin
        .from("oauth_connections")
        .update({ status: "error", last_error: (e as Error).message })
        .eq("id", connectionId);
      return { processed: 0, skipped: 0, error: "token refresh failed" };
    }
  }
  if (!accessToken) return { processed: 0, skipped: 0, error: "no access token" };

  // Load cursor (last processed messageIds set, capped)
  const cursorKey = `gmail:${connectionId}`;
  const { data: state } = await admin
    .from("sync_state")
    .select("cursor")
    .eq("workspace_id", conn.workspace_id)
    .eq("source", cursorKey)
    .maybeSingle();
  const seen = new Set<string>(state?.cursor ? String(state.cursor).split(",").filter(Boolean) : []);

  // List recent INBOX messages
  const listRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&labelIds=INBOX",
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
  if (!listRes.ok) {
    const txt = await listRes.text();
    await admin
      .from("oauth_connections")
      .update({ status: "error", last_error: `list ${listRes.status}: ${txt.slice(0, 200)}` })
      .eq("id", connectionId);
    return { processed: 0, skipped: 0, error: `list ${listRes.status}` };
  }
  const list = (await listRes.json()) as { messages?: GmailListItem[] };
  const items = list.messages ?? [];

  let processed = 0;
  let skipped = 0;
  const nextCursor = new Set<string>(seen);

  for (const item of items) {
    if (seen.has(item.id)) {
      skipped++;
      continue;
    }
    nextCursor.add(item.id);
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    if (!msgRes.ok) continue;
    const msg = (await msgRes.json()) as GmailMessage;
    const from = parseFrom(headerVal(msg, "From"));
    if (!from.email) continue;
    // Skip messages the connected user sent themselves
    if (conn.account_email && from.email === String(conn.account_email).toLowerCase()) {
      skipped++;
      continue;
    }
    const subject = headerVal(msg, "Subject") || "(no subject)";
    const body = extractBody(msg);
    const bodyText = body.text || (body.html ? stripHtml(body.html) : "");
    const receivedAt = msg.internalDate
      ? new Date(Number(msg.internalDate)).toISOString()
      : new Date().toISOString();

    await ingestEmail({
      workspaceId: conn.workspace_id,
      emailId: msg.threadId ?? msg.id,
      fromEmail: from.email,
      fromName: from.name,
      subject,
      bodyText,
      receivedAt,
      source: "gmail",
      mailbox: conn.account_email,
      meta: { gmail_message_id: msg.id, connection_id: connectionId },
    });
    processed++;
  }

  const cursorArr = Array.from(nextCursor).slice(-500);
  await admin.from("sync_state").upsert(
    {
      workspace_id: conn.workspace_id,
      source: cursorKey,
      cursor: cursorArr.join(","),
      last_run_at: new Date().toISOString(),
      last_ok_at: new Date().toISOString(),
      last_error: null,
      stats: { processed, skipped },
    },
    { onConflict: "workspace_id,source" },
  );

  return { processed, skipped };
}

/** Sync every active Gmail connection across every workspace. */
export async function syncAllGmail(): Promise<{ connections: number; processed: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;
  const { data } = await admin
    .from("oauth_connections")
    .select("id")
    .eq("provider", "gmail")
    .in("status", ["active", "error"]);
  let total = 0;
  for (const row of data ?? []) {
    const r = await syncGmailConnection(row.id);
    total += r.processed;
  }
  return { connections: (data ?? []).length, processed: total };
}
