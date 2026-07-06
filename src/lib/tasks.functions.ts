import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type TaskRow = {
  id: string;
  title: string;
  due: string | null;
  priority: "high" | "med" | "low";
  done: boolean;
  linked_to: string;
  source: "manual" | "ai";
  thread_id: string | null;
  created_at: string;
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

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { tasks: [] as TaskRow[] };
    const { data, error } = await context.supabase
      .from("tasks")
      .select("id, title, due, priority, done, linked_to, source, thread_id, created_at")
      .eq("workspace_id", workspaceId)
      .order("done", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { tasks: (data ?? []) as TaskRow[] };
  });

const CreateInput = z.object({
  title: z.string().min(1).max(300),
  due: z.string().nullable().optional(),
  priority: z.enum(["high", "med", "low"]).default("med"),
  linkedTo: z.string().max(200).default(""),
  source: z.enum(["manual", "ai"]).default("manual"),
  threadId: z.string().nullable().optional(),
});

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => CreateInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found");
    const { data: row, error } = await context.supabase
      .from("tasks")
      .insert({
        workspace_id: workspaceId,
        title: data.title,
        due: data.due ?? null,
        priority: data.priority,
        linked_to: data.linkedTo,
        source: data.source,
        thread_id: data.threadId ?? null,
      })
      .select("id, title, due, priority, done, linked_to, source, thread_id, created_at")
      .single();
    if (error) throw error;
    return { task: row as TaskRow };
  });

const ToggleInput = z.object({ id: z.string().uuid(), done: z.boolean() });
export const toggleTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ToggleInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tasks")
      .update({ done: data.done })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

const DeleteInput = z.object({ id: z.string().uuid() });
export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DeleteInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tasks").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

// --- AI generation from inbox threads ---
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

type ThreadSeed = {
  id: string;
  from: string;
  company: string;
  subject: string;
  body: string;
  category: string;
};

const GenerateInput = z.object({
  threads: z
    .array(
      z.object({
        id: z.string(),
        from: z.string(),
        company: z.string(),
        subject: z.string(),
        body: z.string(),
        category: z.string(),
      }),
    )
    .min(1)
    .max(20),
});

async function callGateway(messages: Array<{ role: string; content: string }>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({ model: MODEL, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit hit. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI Gateway ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

export const generateTasksFromThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => GenerateInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found");

    // Skip threads that already produced an AI task
    const { data: existing } = await context.supabase
      .from("tasks")
      .select("thread_id")
      .eq("workspace_id", workspaceId)
      .eq("source", "ai")
      .not("thread_id", "is", null);
    const taken = new Set((existing ?? []).map((r) => r.thread_id));
    const pending = data.threads.filter((t: ThreadSeed) => !taken.has(t.id));
    if (pending.length === 0) return { created: 0, tasks: [] as TaskRow[] };

    const system =
      'You turn sales reply emails into concrete next-step tasks for the rep. Output ONLY compact JSON: {"tasks":[{"thread_id":"...","title":"<max 12 words, imperative>","priority":"high|med|low"}]}. Skip OOO, unsubscribe, spam. High = meeting/hot buyer; med = interested/objection; low = not-now.';
    const user = `Threads:\n${pending
      .map(
        (t) =>
          `- id=${t.id} | ${t.from} @ ${t.company} | ${t.category} | subj: ${t.subject}\n  body: ${t.body.slice(0, 400)}`,
      )
      .join("\n")}`;

    const raw = await callGateway([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    let parsed: { tasks?: Array<{ thread_id: string; title: string; priority: string }> };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI returned invalid JSON");
    }
    const items = (parsed.tasks ?? []).filter(
      (t) => t.title && ["high", "med", "low"].includes(t.priority),
    );
    if (items.length === 0) return { created: 0, tasks: [] as TaskRow[] };

    const byId = new Map(pending.map((t) => [t.id, t]));
    const rows = items
      .filter((it) => byId.has(it.thread_id))
      .map((it) => {
        const seed = byId.get(it.thread_id)!;
        return {
          workspace_id: workspaceId,
          title: it.title.slice(0, 300),
          priority: it.priority as "high" | "med" | "low",
          linked_to: seed.company || seed.from,
          source: "ai" as const,
          thread_id: it.thread_id,
        };
      });
    if (rows.length === 0) return { created: 0, tasks: [] as TaskRow[] };

    const { data: inserted, error } = await context.supabase
      .from("tasks")
      .upsert(rows, { onConflict: "workspace_id,thread_id", ignoreDuplicates: true })
      .select("id, title, due, priority, done, linked_to, source, thread_id, created_at");
    if (error) throw error;
    return { created: inserted?.length ?? 0, tasks: (inserted ?? []) as TaskRow[] };
  });
