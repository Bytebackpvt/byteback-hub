import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type NotifPayload = {
  kind: string;
  title: string;
  body: string;
  link: string | null;
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

async function appendRows(
  spreadsheetId: string,
  sheetName: string,
  rows: (string | number)[][],
): Promise<void> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const sheetsKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovableKey || !sheetsKey) return;
  const range = `${sheetName}!A:E`;
  const url = `${GATEWAY_URL}/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": sheetsKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: rows }),
  }).catch(() => undefined);
}

/**
 * Fan out hot-lead notifications to the workspace's connected Google Sheet.
 * Silent on failure — best-effort delivery.
 */
export async function deliverToSheets(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  notifications: NotifPayload[],
): Promise<void> {
  if (notifications.length === 0) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("workspace_integrations")
    .select("config, status")
    .eq("workspace_id", workspaceId)
    .eq("provider", "google_sheets")
    .eq("status", "connected")
    .maybeSingle();
  if (!data) return;
  const cfg = (data.config ?? {}) as { spreadsheet_id?: string; sheet_name?: string };
  if (!cfg.spreadsheet_id) return;
  const sheetName = cfg.sheet_name || "Leads";
  const ts = new Date().toISOString();
  const rows = notifications.map((n) => [ts, n.kind, n.title, n.body, n.link ?? ""]);
  await appendRows(cfg.spreadsheet_id, sheetName, rows);
}

export async function ensureHeaderRow(
  spreadsheetId: string,
  sheetName: string,
): Promise<void> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const sheetsKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovableKey || !sheetsKey) return;
  const range = `${sheetName}!A1:E1`;
  const getUrl = `${GATEWAY_URL}/spreadsheets/${spreadsheetId}/values/${range}`;
  const res = await fetch(getUrl, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": sheetsKey,
    },
  });
  if (!res.ok) return;
  const json = (await res.json()) as { values?: string[][] };
  if (json.values && json.values.length > 0) return;
  const putUrl = `${GATEWAY_URL}/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  await fetch(putUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": sheetsKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [["Timestamp", "Kind", "Title", "Body", "Link"]],
    }),
  }).catch(() => undefined);
}
