import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const NOTIFICATION_KINDS = [
  "hot_lead",
  "followup",
  "lost_lead",
  "mention",
  "digest",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_CHANNELS = ["in_app", "email", "webhook"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export type PrefMap = Record<
  NotificationKind,
  Record<NotificationChannel, boolean>
>;

const DEFAULTS: PrefMap = {
  hot_lead: { in_app: true, email: true, webhook: true },
  followup: { in_app: true, email: false, webhook: true },
  lost_lead: { in_app: true, email: false, webhook: true },
  mention: { in_app: true, email: true, webhook: false },
  digest: { in_app: false, email: true, webhook: false },
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

function normalize(raw: unknown): PrefMap {
  const source = (raw ?? {}) as Partial<PrefMap>;
  const out = {} as PrefMap;
  for (const k of NOTIFICATION_KINDS) {
    const row = (source[k] ?? {}) as Partial<Record<NotificationChannel, boolean>>;
    out[k] = {
      in_app: row.in_app ?? DEFAULTS[k].in_app,
      email: row.email ?? DEFAULTS[k].email,
      webhook: row.webhook ?? DEFAULTS[k].webhook,
    };
  }
  return out;
}

export const getNotificationPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { prefs: DEFAULTS, workspaceId: null as string | null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any)
      .from("notification_preferences")
      .select("prefs")
      .eq("user_id", context.userId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw error;
    return {
      prefs: normalize(data?.prefs),
      workspaceId,
    };
  });

const PrefInput = z.object({
  prefs: z.record(z.string(), z.record(z.string(), z.boolean())),
});

export const saveNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => PrefInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace");
    const clean = normalize(data.prefs);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("notification_preferences")
      .upsert(
        {
          user_id: context.userId,
          workspace_id: workspaceId,
          prefs: clean,
        },
        { onConflict: "user_id,workspace_id" },
      );
    if (error) throw error;
    return { ok: true as const, prefs: clean };
  });

export const DEFAULT_PREFS = DEFAULTS;
