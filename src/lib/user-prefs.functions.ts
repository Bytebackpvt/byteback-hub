import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const SetInput = z.object({
  key: z.string().min(1).max(80),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
});

export const getUiPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_ui_prefs")
      .select("prefs")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    const prefs = (data?.prefs ?? {}) as Json;
    return { prefs };
  });

export const setUiPref = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SetInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("user_ui_prefs")
      .select("prefs")
      .eq("user_id", userId)
      .maybeSingle();
    const current = (existing?.prefs ?? {}) as Record<string, Json>;
    const next: Record<string, Json> = { ...current, [data.key]: data.value };
    const { error } = await supabase
      .from("user_ui_prefs")
      .upsert({
        user_id: userId,
        prefs: next as Json,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
    return { ok: true as const, prefs: next as Json };
  });
