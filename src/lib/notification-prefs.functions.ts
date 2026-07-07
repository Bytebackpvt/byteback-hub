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

export type QuietHours = {
  enabled: boolean;
  start: number;
  end: number;
  timezone: string;
};

const DEFAULTS: PrefMap = {
  hot_lead: { in_app: true, email: true, webhook: true },
  followup: { in_app: true, email: false, webhook: true },
  lost_lead: { in_app: true, email: false, webhook: true },
  mention: { in_app: true, email: true, webhook: false },
  digest: { in_app: false, email: true, webhook: false },
};

const DEFAULT_QUIET: QuietHours = {
  enabled: false,
  start: 22,
  end: 7,
  timezone: "UTC",
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

function clampHour(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? Math.floor(v) : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 23) return fallback;
  return n;
}

export const getNotificationPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId)
      return {
        prefs: DEFAULTS,
        quiet: DEFAULT_QUIET,
        workspaceId: null as string | null,
      };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any)
      .from("notification_preferences")
      .select("prefs, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, timezone")
      .eq("user_id", context.userId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw error;
    return {
      prefs: normalize(data?.prefs),
      quiet: {
        enabled: Boolean(data?.quiet_hours_enabled ?? DEFAULT_QUIET.enabled),
        start: clampHour(data?.quiet_hours_start, DEFAULT_QUIET.start),
        end: clampHour(data?.quiet_hours_end, DEFAULT_QUIET.end),
        timezone: (data?.timezone as string | undefined) ?? DEFAULT_QUIET.timezone,
      },
      workspaceId,
    };
  });

const PrefInput = z.object({
  prefs: z.record(z.string(), z.record(z.string(), z.boolean())),
  quiet: z
    .object({
      enabled: z.boolean(),
      start: z.number().int().min(0).max(23),
      end: z.number().int().min(0).max(23),
      timezone: z.string().min(1).max(64),
    })
    .optional(),
});

export const saveNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => PrefInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace");
    const clean = normalize(data.prefs);
    const quiet = data.quiet ?? DEFAULT_QUIET;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("notification_preferences")
      .upsert(
        {
          user_id: context.userId,
          workspace_id: workspaceId,
          prefs: clean,
          quiet_hours_enabled: quiet.enabled,
          quiet_hours_start: quiet.start,
          quiet_hours_end: quiet.end,
          timezone: quiet.timezone,
        },
        { onConflict: "user_id,workspace_id" },
      );
    if (error) throw error;
    return { ok: true as const, prefs: clean, quiet };
  });

export const DEFAULT_PREFS = DEFAULTS;
export const DEFAULT_QUIET_HOURS = DEFAULT_QUIET;

/**
 * Server-side helper: returns whether "now" falls inside a user's quiet hours,
 * evaluated in their configured IANA timezone. Called by delivery paths.
 */
export function isInQuietHours(quiet: QuietHours, now: Date = new Date()): boolean {
  if (!quiet.enabled) return false;
  let hour: number;
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: quiet.timezone || "UTC",
      hour12: false,
      hour: "2-digit",
    });
    hour = Number(fmt.format(now));
    if (!Number.isFinite(hour)) hour = now.getUTCHours();
  } catch {
    hour = now.getUTCHours();
  }
  const { start, end } = quiet;
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  // Wraps midnight, e.g. 22 -> 7
  return hour >= start || hour < end;
}
