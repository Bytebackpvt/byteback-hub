import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

export async function syncGmailConnection(connectionId: string): Promise<{
  processed: number;
  skipped: number;
  error?: string;
}> {
  const { ingestEmail, decryptToken, encryptToken, stripHtml } = await import("@/lib/email-ingest.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;

  const { data: conn, error: connErr } = await admin
    .from("oauth_connections")
    .select("*")
    .eq("id", connectionId)
    .maybeSingle();
  if (connErr || !conn) return { processed: 0, skipped: 0, error: "connection not found" };

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
      } else {
        await admin
          .from("oauth_connections")
          .update({ status: "error", last_error: "Reconnect Gmail: permission expired or revoked" })
          .eq("id", connectionId);
        return { processed: 0, skipped: 0, error: "Reconnect Gmail" };
      }
    } catch (e) {
      await admin
        .from("oauth_connections")
        .update({ status: "error", last_error: `Reconnect Gmail: ${(e as Error).message}` })
        .eq("id", connectionId);
      return { processed: 0, skipped: 0, error: "Reconnect Gmail" };
    }
  }
  if (!accessToken) return { processed: 0, skipped: 0, error: "no access token" };

  const items: Array<GmailListItem & { _label: "INBOX" | "SENT" }> = [];
  // Full backfill: paginate INBOX and SENT with no time window and no cap.
  // Gmail returns newest first; loop until nextPageToken is exhausted.
  for (const label of ["INBOX", "SENT"] as const) {
    let pageToken: string | undefined;
    while (true) {
      const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
      url.searchParams.set("maxResults", "500");
      url.searchParams.set("labelIds", label);
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const listRes = await fetch(url.toString(), {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      if (!listRes.ok) {
        const txt = await listRes.text();
        await admin
          .from("oauth_connections")
          .update({ status: "error", last_error: `list ${listRes.status}: ${txt.slice(0, 200)}` })
          .eq("id", connectionId);
        return { processed: 0, skipped: 0, error: `list ${listRes.status}` };
      }
      const list = (await listRes.json()) as { messages?: GmailListItem[]; nextPageToken?: string };
      const batch = list.messages ?? [];
      items.push(...batch.map((m) => ({ ...m, _label: label })));
      if (!list.nextPageToken) break;
      pageToken = list.nextPageToken;
    }
  }



  let processed = 0;
  let skipped = 0;

  for (const item of items) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    if (!msgRes.ok) continue;
    const msg = (await msgRes.json()) as GmailMessage;
    const isSent = item._label === "SENT";
    const from = parseFrom(headerVal(msg, "From"));
    const to = parseFrom(headerVal(msg, "To"));
    // For sent items, thread key by counterparty (recipient); for inbox, by sender.
    const counterparty = isSent ? to : from;
    if (!counterparty.email) continue;
    const subject = headerVal(msg, "Subject") || "(no subject)";
    const body = extractBody(msg);
    const bodyText = body.text || (body.html ? stripHtml(body.html) : "");
    const receivedAt = msg.internalDate
      ? new Date(Number(msg.internalDate)).toISOString()
      : new Date().toISOString();

    await ingestEmail({
      workspaceId: conn.workspace_id,
      emailId: msg.id,
      fromEmail: counterparty.email,
      fromName: counterparty.name,
      subject,
      bodyText,
      receivedAt,
      source: "gmail",
      mailbox: conn.account_email,
      meta: {
        gmail_message_id: msg.id,
        gmail_thread_id: msg.threadId ?? null,
        connection_id: connectionId,
        direction: isSent ? "out" : "in",
      },
    });
    processed++;
  }


  await admin.from("sync_state").upsert(
    {
      workspace_id: conn.workspace_id,
      source: `gmail:${connectionId}`,
      cursor: null,
      last_run_at: new Date().toISOString(),
      last_ok_at: new Date().toISOString(),
      last_error: null,
      stats: { processed, skipped, inbox_backfilled: items.filter((i) => i._label === "INBOX").length, sent_backfilled: items.filter((i) => i._label === "SENT").length },
    },
    { onConflict: "workspace_id,source" },
  );

  return { processed, skipped };
}

export async function syncAllGmail(): Promise<{ connections: number; processed: number }> {
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