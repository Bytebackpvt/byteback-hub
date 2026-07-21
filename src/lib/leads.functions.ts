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

async function readCurrent(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  leadKey: string,
): Promise<{ manual_status: string | null; stage: string | null } | null> {
  const { data } = await supabase
    .from("lead_scores")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select("manual_status, stage" as any)
    .eq("workspace_id", workspaceId)
    .eq("lead_key", leadKey)
    .maybeSingle();
  return (data as unknown as { manual_status: string | null; stage: string | null } | null) ?? null;
}

async function writeAudit(
  supabase: SupabaseClient<Database>,
  params: {
    workspaceId: string;
    leadKey: string;
    actorId: string;
    actorEmail: string | null;
    changeType: "stage" | "manual_status";
    oldValue: string | null;
    newValue: string | null;
  },
) {
  await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("lead_audit_log" as any)
    .insert({
      workspace_id: params.workspaceId,
      lead_key: params.leadKey,
      actor_id: params.actorId,
      actor_email: params.actorEmail,
      change_type: params.changeType,
      old_value: params.oldValue,
      new_value: params.newValue,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
}

export const setLeadManualStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ManualStatusInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found");
    const prev = await readCurrent(context.supabase, workspaceId, data.leadKey);
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
    if ((prev?.manual_status ?? null) !== (data.manualStatus ?? null)) {
      await writeAudit(context.supabase, {
        workspaceId,
        leadKey: data.leadKey,
        actorId: context.userId,
        actorEmail: (context.claims as { email?: string } | null)?.email ?? null,
        changeType: "manual_status",
        oldValue: prev?.manual_status ?? null,
        newValue: data.manualStatus ?? null,
      }).catch((e) => console.error("audit write failed:", e));
    }
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
    const prev = await readCurrent(context.supabase, workspaceId, data.leadKey);
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
    if ((prev?.stage ?? null) !== (data.stage ?? null)) {
      await writeAudit(context.supabase, {
        workspaceId,
        leadKey: data.leadKey,
        actorId: context.userId,
        actorEmail: (context.claims as { email?: string } | null)?.email ?? null,
        changeType: "stage",
        oldValue: prev?.stage ?? null,
        newValue: data.stage ?? null,
      }).catch((e) => console.error("audit write failed:", e));
    }
    return { ok: true as const };
  });

export type LeadAuditEntry = {
  id: string;
  changeType: "stage" | "manual_status";
  oldValue: string | null;
  newValue: string | null;
  actorEmail: string | null;
  createdAt: string;
};

const ListAuditInput = z.object({ leadKey: z.string().min(1) });

export const listLeadAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ListAuditInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { entries: [] as LeadAuditEntry[] };
    const { data: rows, error } = await context.supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("lead_audit_log" as any)
      .select("id, change_type, old_value, new_value, actor_email, created_at")
      .eq("workspace_id", workspaceId)
      .eq("lead_key", data.leadKey)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries: LeadAuditEntry[] = ((rows as any[]) ?? []).map((r) => ({
      id: String(r.id),
      changeType: r.change_type as "stage" | "manual_status",
      oldValue: (r.old_value as string | null) ?? null,
      newValue: (r.new_value as string | null) ?? null,
      actorEmail: (r.actor_email as string | null) ?? null,
      createdAt: String(r.created_at),
    }));
    return { entries };
  });

