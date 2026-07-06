import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

async function getWorkspaceId(
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
  if (data?.id) return data.id as string;
  const { data: m } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (m?.workspace_id as string | undefined) ?? null;
}

const LogEventInput = z.object({
  threadId: z.string().min(1),
  leadEmail: z.string().optional(),
  eventType: z.enum([
    "classified",
    "assigned",
    "reminder_created",
    "escalated",
    "reply_sent",
    "note",
    "feedback",
    "status_change",
    "scored",
  ]),
  title: z.string().min(1).max(200),
  detail: z.string().max(1000).optional(),
  category: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  nextAction: z.string().optional(),
  reason: z.string().max(500).optional(),
  meta: z.record(z.unknown()).optional(),
});

export const logAiEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => LogEventInput.parse(raw))
  .handler(async ({ data, context }) => {
    const wsId = await getWorkspaceId(context.supabase, context.userId);
    if (!wsId) return { ok: false };
    const { error } = await context.supabase.from("ai_events").insert({
      workspace_id: wsId,
      user_id: context.userId,
      thread_id: data.threadId,
      lead_email: data.leadEmail ?? null,
      event_type: data.eventType,
      title: data.title,
      detail: data.detail ?? null,
      category: data.category ?? null,
      confidence: data.confidence ?? null,
      next_action: data.nextAction ?? null,
      reason: data.reason ?? null,
      meta: (data.meta ?? {}) as never,
    });
    if (error) throw error;
    return { ok: true };
  });

const ListInput = z.object({ threadId: z.string().min(1) });

export const listAiEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ListInput.parse(raw))
  .handler(async ({ data, context }) => {
    const wsId = await getWorkspaceId(context.supabase, context.userId);
    if (!wsId) return { events: [] };
    const { data: rows, error } = await context.supabase
      .from("ai_events")
      .select("*")
      .eq("workspace_id", wsId)
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return { events: rows ?? [] };
  });

const FeedbackInput = z.object({
  threadId: z.string().min(1),
  suggestionType: z.enum(["classification", "next_action", "reply", "score"]),
  suggestionValue: z.string().min(1).max(500),
  verdict: z.enum(["accepted", "rejected"]),
  correction: z.string().max(500).optional(),
});

export const submitAiFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => FeedbackInput.parse(raw))
  .handler(async ({ data, context }) => {
    const wsId = await getWorkspaceId(context.supabase, context.userId);
    if (!wsId) return { ok: false };
    const { error } = await context.supabase.from("ai_feedback").insert({
      workspace_id: wsId,
      user_id: context.userId,
      thread_id: data.threadId,
      suggestion_type: data.suggestionType,
      suggestion_value: data.suggestionValue,
      verdict: data.verdict,
      correction: data.correction ?? null,
    });
    if (error) throw error;
    // Mirror into timeline for auditability
    await context.supabase.from("ai_events").insert({
      workspace_id: wsId,
      user_id: context.userId,
      thread_id: data.threadId,
      event_type: "feedback",
      title: `${data.verdict === "accepted" ? "Accepted" : "Rejected"} AI ${data.suggestionType}`,
      detail: data.correction ?? data.suggestionValue,
      meta: { suggestionType: data.suggestionType, verdict: data.verdict } as never,
    });
    return { ok: true };
  });
