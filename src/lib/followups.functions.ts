import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";

async function getOwnedWorkspaceId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  return (await getCurrentWorkspaceId(supabase, userId)) ?? null;
}

// Rules: due date + priority derived from lead interest / reply sentiment.
type Category =
  | "meeting"
  | "interested"
  | "objection"
  | "not-now"
  | "not-interested"
  | "ooo"
  | "unsubscribe"
  | "spam";

type Sentiment = "positive" | "neutral" | "negative";

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

function planFollowUp(
  category: Category,
  sentiment: Sentiment,
): { due: string; priority: "high" | "med" | "low"; verb: string } | null {
  if (category === "unsubscribe" || category === "spam") return null;
  if (category === "meeting")
    return { due: daysFromNow(1), priority: "high", verb: "Confirm meeting time with" };
  if (category === "interested")
    return {
      due: daysFromNow(sentiment === "positive" ? 1 : 2),
      priority: "high",
      verb: "Send follow-up + next step to",
    };
  if (category === "objection")
    return { due: daysFromNow(2), priority: "med", verb: "Address objection with" };
  if (category === "not-now")
    return { due: daysFromNow(14), priority: "low", verb: "Re-engage later:" };
  if (category === "ooo")
    return { due: daysFromNow(7), priority: "low", verb: "Retry after OOO:" };
  if (category === "not-interested") return null;
  return { due: daysFromNow(3), priority: "med", verb: "Follow up with" };
}

const ScheduleInput = z.object({
  threadId: z.string().min(1),
  fromName: z.string(),
  company: z.string(),
  category: z.enum([
    "meeting",
    "interested",
    "objection",
    "not-now",
    "not-interested",
    "ooo",
    "unsubscribe",
    "spam",
  ]),
  sentiment: z.enum(["positive", "neutral", "negative"]).default("neutral"),
});

export const scheduleFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ScheduleInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace");
    const plan = planFollowUp(data.category, data.sentiment);
    if (!plan) return { scheduled: false as const, reason: "No follow-up for this category" };

    const title = `${plan.verb} ${data.fromName}`;
    const payload = {
      workspace_id: workspaceId,
      title: title.slice(0, 300),
      priority: plan.priority,
      due: plan.due,
      linked_to: `${data.company || data.fromName} · ${data.category}`,
      source: "ai" as const,
      thread_id: data.threadId,
    };
    // Partial unique index (source='ai') isn't usable via PostgREST onConflict;
    // find-then-update/insert instead.
    const { data: existing, error: findErr } = await context.supabase
      .from("tasks")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("source", "ai")
      .eq("thread_id", data.threadId)
      .maybeSingle();
    if (findErr) throw findErr;
    const q = existing
      ? context.supabase.from("tasks").update(payload).eq("id", existing.id)
      : context.supabase.from("tasks").insert(payload);
    const { data: row, error } = await q.select("id, title, due, priority").single();
    if (error) throw error;
    return { scheduled: true as const, task: row };
  });

// Batch: iterate threads and auto-schedule follow-ups.
const BatchInput = z.object({
  threads: z
    .array(
      z.object({
        id: z.string(),
        fromName: z.string(),
        company: z.string(),
        category: z.enum([
          "meeting",
          "interested",
          "objection",
          "not-now",
          "not-interested",
          "ooo",
          "unsubscribe",
          "spam",
        ]),
        sentiment: z.enum(["positive", "neutral", "negative"]).default("neutral"),
      }),
    )
    .max(50),
});

export const autoScheduleFollowUps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => BatchInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { scheduled: 0 };

    const rows: Array<{
      workspace_id: string;
      title: string;
      priority: "high" | "med" | "low";
      due: string;
      linked_to: string;
      source: "ai";
      thread_id: string;
    }> = [];
    for (const t of data.threads) {
      const plan = planFollowUp(t.category, t.sentiment);
      if (!plan) continue;
      rows.push({
        workspace_id: workspaceId,
        title: `${plan.verb} ${t.fromName}`.slice(0, 300),
        priority: plan.priority,
        due: plan.due,
        linked_to: `${t.company || t.fromName} · ${t.category}`,
        source: "ai",
        thread_id: t.id,
      });
    }
    if (rows.length === 0) return { scheduled: 0 };
    const threadIds = rows.map((r) => r.thread_id);
    // Skip threads whose last message is outbound (we already replied) — avoids task noise.
    const { data: threadRows } = await context.supabase
      .from("email_threads")
      .select("thread_id, meta")
      .eq("workspace_id", workspaceId)
      .in("thread_id", threadIds);
    const outbound = new Set(
      (threadRows ?? [])
        .filter((r) => {
          const m = r.meta as { direction?: string } | null;
          return m?.direction === "out";
        })
        .map((r) => r.thread_id as string),
    );
    // Partial unique index (source='ai') can't be used by PostgREST onConflict,
    // so pre-filter thread_ids that already have an AI task.
    const { data: existing, error: existingErr } = await context.supabase
      .from("tasks")
      .select("thread_id")
      .eq("workspace_id", workspaceId)
      .eq("source", "ai")
      .in("thread_id", threadIds);
    if (existingErr) throw existingErr;
    const taken = new Set((existing ?? []).map((r) => r.thread_id as string));
    const toInsert = rows.filter((r) => !taken.has(r.thread_id) && !outbound.has(r.thread_id));
    if (toInsert.length === 0) return { scheduled: 0 };

    const { data: inserted, error } = await context.supabase
      .from("tasks")
      .upsert(toInsert, { onConflict: "workspace_id,thread_id", ignoreDuplicates: true })
      .select("id");
    if (error) throw error;
    return { scheduled: inserted?.length ?? 0 };
  });
