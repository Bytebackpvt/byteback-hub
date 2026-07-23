import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// ---------------- Temperatures ----------------

export type Temperature = {
  id: string;
  slug: string;
  label: string;
  color: string;
  sort_order: number;
  is_system: boolean;
};

async function requireWorkspace(supabase: SupabaseClient<Database>, userId: string): Promise<string> {
  const ws = await getCurrentWorkspaceId(supabase, userId);
  if (!ws) throw new Error("No workspace");
  return ws;
}

export const listTemperatures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ temperatures: Temperature[] }> => {
    const ws = await requireWorkspace(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any)
      .from("workspace_temperatures")
      .select("id, slug, label, color, sort_order, is_system")
      .eq("workspace_id", ws)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return { temperatures: (data ?? []) as Temperature[] };
  });

const UpsertTempInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(40).regex(/^[a-z0-9_-]+$/i, "letters, digits, _ or - only"),
  label: z.string().min(1).max(60),
  color: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, "hex color required"),
  sort_order: z.number().int().min(0).max(999).default(0),
});
export const upsertTemperature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => UpsertTempInput.parse(raw))
  .handler(async ({ data, context }) => {
    const ws = await requireWorkspace(context.supabase, context.userId);
    const row = { ...data, workspace_id: ws, is_system: false };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("workspace_temperatures")
      .upsert(row, { onConflict: "workspace_id,slug" });
    if (error) throw error;
    return { ok: true as const };
  });

const DeleteTempInput = z.object({ id: z.string().uuid() });
export const deleteTemperature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DeleteTempInput.parse(raw))
  .handler(async ({ data, context }) => {
    const ws = await requireWorkspace(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("workspace_temperatures")
      .delete()
      .eq("workspace_id", ws)
      .eq("id", data.id)
      .eq("is_system", false);
    if (error) throw error;
    return { ok: true as const };
  });

// ---------------- Follow-up config ----------------

export type FollowupConfig = {
  ladder_minutes: number[];
  channels: { push: boolean; in_app: boolean; email: boolean; slack: boolean };
  enabled: boolean;
};

const DEFAULT_CONFIG: FollowupConfig = {
  ladder_minutes: [15, 60, 240, 1440, 2880],
  channels: { push: true, in_app: true, email: true, slack: false },
  enabled: true,
};

export const getFollowupConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FollowupConfig> => {
    const ws = await requireWorkspace(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any)
      .from("workspace_followup_config")
      .select("ladder_minutes, channels, enabled")
      .eq("workspace_id", ws)
      .maybeSingle();
    if (error) throw error;
    if (!data) return DEFAULT_CONFIG;
    return {
      ladder_minutes: (data.ladder_minutes as number[]) ?? DEFAULT_CONFIG.ladder_minutes,
      channels: { ...DEFAULT_CONFIG.channels, ...((data.channels ?? {}) as FollowupConfig["channels"]) },
      enabled: Boolean(data.enabled),
    };
  });

const SaveConfigInput = z.object({
  ladder_minutes: z.array(z.number().int().min(1).max(60 * 24 * 30)).min(1).max(10),
  channels: z.object({
    push: z.boolean(),
    in_app: z.boolean(),
    email: z.boolean(),
    slack: z.boolean(),
  }),
  enabled: z.boolean(),
});
export const saveFollowupConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SaveConfigInput.parse(raw))
  .handler(async ({ data, context }) => {
    const ws = await requireWorkspace(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("workspace_followup_config")
      .upsert({ workspace_id: ws, ...data }, { onConflict: "workspace_id" });
    if (error) throw error;
    return { ok: true as const };
  });
