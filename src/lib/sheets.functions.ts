import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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

function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  // Allow raw ID
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

const SaveInput = z.object({
  spreadsheet_url_or_id: z.string().min(1),
  sheet_name: z.string().min(1).max(60).optional(),
});

export const saveSheetsIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SaveInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace");
    const spreadsheetId = extractSpreadsheetId(data.spreadsheet_url_or_id);
    if (!spreadsheetId) throw new Error("Could not read a spreadsheet ID from that URL");
    const sheetName = (data.sheet_name || "Leads").trim();

    // Verify access + ensure header row.
    const lovableKey = process.env.LOVABLE_API_KEY;
    const sheetsKey = process.env.GOOGLE_SHEETS_API_KEY;
    if (!lovableKey || !sheetsKey) throw new Error("Google Sheets connector not configured");
    const metaUrl = `https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`;
    const res = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": sheetsKey,
      },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Cannot access spreadsheet (${res.status}). ${t.slice(0, 200)}`);
    }
    const meta = (await res.json()) as {
      properties?: { title?: string };
      sheets?: Array<{ properties?: { title?: string } }>;
    };
    const availableTabs = (meta.sheets ?? [])
      .map((s) => s.properties?.title)
      .filter((x): x is string => Boolean(x));
    if (availableTabs.length && !availableTabs.includes(sheetName)) {
      throw new Error(
        `Tab "${sheetName}" not found. Available tabs: ${availableTabs.join(", ")}`,
      );
    }

    const { ensureHeaderRow } = await import("./sheets-delivery.server");
    await ensureHeaderRow(spreadsheetId, sheetName);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("workspace_integrations")
      .upsert(
        {
          workspace_id: workspaceId,
          provider: "google_sheets",
          status: "connected",
          label: meta.properties?.title ?? null,
          config: { spreadsheet_id: spreadsheetId, sheet_name: sheetName },
          secret: null,
          created_by: context.userId,
        },
        { onConflict: "workspace_id,provider" },
      );
    if (error) throw error;
    return { ok: true as const, spreadsheet_id: spreadsheetId, title: meta.properties?.title };
  });

export const testSheetsIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace");
    const { deliverToSheets } = await import("./sheets-delivery.server");
    await deliverToSheets(context.supabase, workspaceId, [
      {
        kind: "test",
        title: "✅ ByteBack Sheets test",
        body: "This row was written by ByteBack to confirm the sync works.",
        link: null,
      },
    ]);
    return { ok: true as const };
  });
