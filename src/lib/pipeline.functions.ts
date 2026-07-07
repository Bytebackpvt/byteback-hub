import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type StageAutomation = {
  auto_task?: {
    enabled: boolean;
    days_offset: number; // 0 = today, 1 = tomorrow, ...
    priority: "high" | "med" | "low";
    title: string; // supports {name} and {company} placeholders
  };
  notify?: {
    enabled: boolean;
    message?: string; // supports {name} and {company}
  };
};

export type PipelineStage = {
  id: string;
  slug: string;
  label: string;
  color: string;
  icon: string;
  sort_order: number;
  is_won: boolean;
  is_lost: boolean;
  automation: StageAutomation;
};

// Default seed used when a workspace has no custom stages yet. Matches the
// live Instantly status set so cards flow into columns out of the box.
const DEFAULTS: Array<Omit<PipelineStage, "id">> = [
  { slug: "new", label: "New replies", color: "sky", icon: "inbox", sort_order: 0, is_won: false, is_lost: false, automation: {} },
  { slug: "interested", label: "Interested", color: "indigo", icon: "flame", sort_order: 1, is_won: false, is_lost: false, automation: {} },
  { slug: "meeting", label: "Meeting booked", color: "violet", icon: "calendar", sort_order: 2, is_won: false, is_lost: false, automation: {} },
  { slug: "customer", label: "Closed won", color: "emerald", icon: "trophy", sort_order: 3, is_won: true, is_lost: false, automation: {} },
  { slug: "not-interested", label: "Lost", color: "rose", icon: "x", sort_order: 4, is_won: false, is_lost: true, automation: {} },
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

function normalizeAutomation(raw: unknown): StageAutomation {
  if (!raw || typeof raw !== "object") return {};
  const a = raw as Record<string, unknown>;
  const out: StageAutomation = {};
  if (a.auto_task && typeof a.auto_task === "object") {
    const t = a.auto_task as Record<string, unknown>;
    out.auto_task = {
      enabled: Boolean(t.enabled),
      days_offset: typeof t.days_offset === "number" ? t.days_offset : 1,
      priority: t.priority === "high" || t.priority === "low" ? t.priority : "med",
      title: typeof t.title === "string" ? t.title : "Follow up with {name}",
    };
  }
  if (a.notify && typeof a.notify === "object") {
    const n = a.notify as Record<string, unknown>;
    out.notify = {
      enabled: Boolean(n.enabled),
      message: typeof n.message === "string" ? n.message : undefined,
    };
  }
  return out;
}

export const listPipelineStages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { stages: [] as PipelineStage[], workspaceId: null };
    const { data, error } = await context.supabase
      .from("pipeline_stages")
      .select("id, slug, label, color, icon, sort_order, is_won, is_lost, automation")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    let rows = data ?? [];
    if (rows.length === 0) {
      const seedRows = DEFAULTS.map((d) => ({ ...d, workspace_id: workspaceId }));
      const { data: seeded, error: seedErr } = await context.supabase
        .from("pipeline_stages")
        .insert(seedRows)
        .select("id, slug, label, color, icon, sort_order, is_won, is_lost, automation");
      if (seedErr) throw seedErr;
      rows = seeded ?? [];
    }
    const stages: PipelineStage[] = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      label: r.label,
      color: r.color,
      icon: r.icon ?? "circle",
      sort_order: r.sort_order,
      is_won: r.is_won,
      is_lost: r.is_lost,
      automation: normalizeAutomation(r.automation),
    }));
    return { stages, workspaceId };
  });

const AutomationSchema = z
  .object({
    auto_task: z
      .object({
        enabled: z.boolean(),
        days_offset: z.number().int().min(0).max(365),
        priority: z.enum(["high", "med", "low"]),
        title: z.string().min(1).max(200),
      })
      .optional(),
    notify: z
      .object({
        enabled: z.boolean(),
        message: z.string().max(200).optional(),
      })
      .optional(),
  })
  .default({});

const UpsertInput = z.object({
  id: z.string().uuid().nullable(),
  slug: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, dashes only"),
  label: z.string().min(1).max(60),
  color: z.string().min(1).max(20),
  icon: z.string().min(1).max(30).default("circle"),
  is_won: z.boolean().default(false),
  is_lost: z.boolean().default(false),
  automation: AutomationSchema,
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
          icon: data.icon,
          is_won: data.is_won,
          is_lost: data.is_lost,
          automation: data.automation as never,
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
        icon: data.icon,
        sort_order: nextOrder,
        is_won: data.is_won,
        is_lost: data.is_lost,
        automation: data.automation as never,
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

// -------------------- Automation runner --------------------
//
// Called by updateLeadStatus (instantly.functions) after a lead moves.
// Fires the target stage's automation: create a follow-up task and/or
// send an in-app notification. Runs as the signed-in user so RLS applies.

const RunAutomationInput = z.object({
  stageSlug: z.string().min(1),
  lead: z.object({
    id: z.string().min(1),
    name: z.string().default(""),
    company: z.string().default(""),
    email: z.string().default(""),
  }),
});

function daysFromNowISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

function fill(template: string, lead: { name: string; company: string }) {
  return template
    .replace(/\{name\}/g, lead.name || "lead")
    .replace(/\{company\}/g, lead.company || "");
}

export const runStageAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => RunAutomationInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { ran: false as const, reason: "no-workspace" };

    const { data: stage } = await context.supabase
      .from("pipeline_stages")
      .select("automation, label")
      .eq("workspace_id", workspaceId)
      .eq("slug", data.stageSlug)
      .maybeSingle();
    if (!stage) return { ran: false as const, reason: "no-stage" };

    const automation = normalizeAutomation(stage.automation);
    const actions: string[] = [];

    if (automation.auto_task?.enabled) {
      const t = automation.auto_task;
      const title = fill(t.title, data.lead).slice(0, 300);
      const payload = {
        workspace_id: workspaceId,
        title,
        priority: t.priority,
        due: daysFromNowISO(t.days_offset),
        linked_to: `${data.lead.company || data.lead.name} · ${data.stageSlug}`,
        source: "ai" as const,
        thread_id: `stage:${data.stageSlug}:${data.lead.id}`,
      };
      const { data: existing } = await context.supabase
        .from("tasks")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("source", "ai")
        .eq("thread_id", payload.thread_id)
        .maybeSingle();
      const q = existing
        ? context.supabase.from("tasks").update(payload).eq("id", existing.id)
        : context.supabase.from("tasks").insert(payload);
      const { error } = await q;
      if (!error) actions.push("task");
    }

    if (automation.notify?.enabled) {
      const msg = fill(
        automation.notify.message ?? `${data.lead.name || "Lead"} moved to ${stage.label}`,
        data.lead,
      ).slice(0, 240);
      const { error } = await context.supabase.from("notifications").insert({
        workspace_id: workspaceId,
        user_id: context.userId,
        title: `Stage: ${stage.label}`,
        body: msg,
        kind: "info",
        link: "/app/pipeline",
      });
      if (!error) actions.push("notify");
    }


    return { ran: actions.length > 0, actions };
  });
