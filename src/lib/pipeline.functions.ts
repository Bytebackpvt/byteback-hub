import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type PipelineStage = {
  id: string;
  slug: string;
  label: string;
  color: string;
  sort_order: number;
  is_won: boolean;
  is_lost: boolean;
};

// Default seed used when a workspace has no custom stages yet. Matches the
// live Instantly status set so cards flow into columns out of the box.
const DEFAULTS: Array<Omit<PipelineStage, "id">> = [
  { slug: "new", label: "New replies", color: "sky", sort_order: 0, is_won: false, is_lost: false },
  { slug: "interested", label: "Interested", color: "indigo", sort_order: 1, is_won: false, is_lost: false },
  { slug: "meeting", label: "Meeting booked", color: "violet", sort_order: 2, is_won: false, is_lost: false },
  { slug: "customer", label: "Closed won", color: "emerald", sort_order: 3, is_won: true, is_lost: false },
  { slug: "not-interested", label: "Lost", color: "rose", sort_order: 4, is_won: false, is_lost: true },
];

async function getOwnedWorkspaceId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export const listPipelineStages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { stages: [] as PipelineStage[], workspaceId: null };
    const { data, error } = await context.supabase
      .from("pipeline_stages")
      .select("id, slug, label, color, sort_order, is_won, is_lost")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    let stages = (data ?? []) as PipelineStage[];
    if (stages.length === 0) {
      const rows = DEFAULTS.map((d) => ({ ...d, workspace_id: workspaceId }));
      const { data: seeded, error: seedErr } = await context.supabase
        .from("pipeline_stages")
        .insert(rows)
        .select("id, slug, label, color, sort_order, is_won, is_lost");
      if (seedErr) throw seedErr;
      stages = (seeded ?? []) as PipelineStage[];
    }
    return { stages, workspaceId };
  });

const UpsertInput = z.object({
  id: z.string().uuid().nullable(),
  slug: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, dashes only"),
  label: z.string().min(1).max(60),
  color: z.string().min(1).max(20),
  is_won: z.boolean().default(false),
  is_lost: z.boolean().default(false),
});

export const upsertPipelineStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => UpsertInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace");
    if (data.id) {
      const { error } = await context.supabase
        .from("pipeline_stages")
        .update({
          slug: data.slug,
          label: data.label,
          color: data.color,
          is_won: data.is_won,
          is_lost: data.is_lost,
        })
        .eq("id", data.id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return { ok: true as const, id: data.id };
    }
    const { data: max } = await context.supabase
      .from("pipeline_stages")
      .select("sort_order")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = ((max?.sort_order as number | undefined) ?? -1) + 1;
    const { data: row, error } = await context.supabase
      .from("pipeline_stages")
      .insert({
        workspace_id: workspaceId,
        slug: data.slug,
        label: data.label,
        color: data.color,
        sort_order: nextOrder,
        is_won: data.is_won,
        is_lost: data.is_lost,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true as const, id: row.id as string };
  });

const DeleteInput = z.object({ id: z.string().uuid() });
export const deletePipelineStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DeleteInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace");
    const { error } = await context.supabase
      .from("pipeline_stages")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return { ok: true as const };
  });

const ReorderInput = z.object({
  order: z.array(z.string().uuid()).min(1).max(30),
});
export const reorderPipelineStages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ReorderInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace");
    // Update each row's sort_order. Small N (<=30), individual updates are fine.
    await Promise.all(
      data.order.map((id, idx) =>
        context.supabase
          .from("pipeline_stages")
          .update({ sort_order: idx })
          .eq("id", id)
          .eq("workspace_id", workspaceId),
      ),
    );
    return { ok: true as const };
  });
