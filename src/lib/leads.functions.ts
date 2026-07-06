import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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


export const listLeadScores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { scores: [] as Array<{ lead_key: string; score: number; reason: string }> };
    const { data, error } = await context.supabase
      .from("lead_scores")
      .select("lead_key, score, reason")
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return { scores: data ?? [] };
  });

const SaveInput = z.object({
  leadKey: z.string().min(1),
  score: z.number().int().min(0).max(100),
  reason: z.string().max(500).default(""),
});

export const saveLeadScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SaveInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found for user");
    const { error } = await context.supabase.from("lead_scores").upsert(
      {
        workspace_id: workspaceId,
        lead_key: data.leadKey,
        score: data.score,
        reason: data.reason,
      },
      { onConflict: "workspace_id,lead_key" },
    );
    if (error) throw error;
    return { ok: true as const };
  });
