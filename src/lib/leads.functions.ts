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

export type LeadScoreRow = {
  lead_key: string;
  score: number;
  reason: string;
  manual_status: string | null;
  stage: string | null;
};

export const listLeadScores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { scores: [] as LeadScoreRow[] };
    const { data, error } = await context.supabase
      .from("lead_scores")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("lead_key, score, reason, manual_status, stage" as any)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return { scores: (data as unknown as LeadScoreRow[]) ?? [] };
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

const ManualStatusInput = z.object({
  leadKey: z.string().min(1),
  manualStatus: z.enum(["hot", "warm", "cold", "not-interested"]).nullable(),
});

export const setLeadManualStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ManualStatusInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found");
    const { error } = await context.supabase.from("lead_scores").upsert(
      {
        workspace_id: workspaceId,
        lead_key: data.leadKey,
        score: 0,
        reason: "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        manual_status: data.manualStatus,
      } as any,
      { onConflict: "workspace_id,lead_key", ignoreDuplicates: false },
    );
    if (error) throw error;
    return { ok: true as const };
  });

const StageInput = z.object({
  leadKey: z.string().min(1),
  stage: z.enum(["open", "contacted", "meeting", "won", "lost", "churned"]).nullable(),
});

export const setLeadStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => StageInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found");
    const { error } = await context.supabase.from("lead_scores").upsert(
      {
        workspace_id: workspaceId,
        lead_key: data.leadKey,
        score: 0,
        reason: "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stage: data.stage,
      } as any,
      { onConflict: "workspace_id,lead_key", ignoreDuplicates: false },
    );
    if (error) throw error;
    return { ok: true as const };
  });
