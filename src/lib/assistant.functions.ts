import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const APP_MAP = `ByteBack sections (only mention when user asks WHERE something lives):
Dashboard /app · Radar /app/radar · Inbox /app/inbox · Contacts /app/crm · Pipeline /app/pipeline · Tasks /app/tasks · Analytics /app/analytics · Integrations /app/integrations · Email Sources /app/email-sources.
Lead status = hot|warm|cold|not-interested. Stage = open|contacted|meeting|won|lost|churned.`;

const SYSTEM = `You are ByteBack Assistant — an in-app doer, not a guide. When the user asks for info OR to take an action, USE THE TOOLS to do it yourself instead of telling them where to click. Always call tools when the answer needs live data (counts, lists, statuses) or a change. Only fall back to text guidance if no tool fits.

Rules:
- Mirror user's language (English, Hindi, Hinglish).
- Keep prose replies under 60 words. Use plain markdown, no headings.
- When you call set_lead_status / set_lead_stage / complete_task, confirm the change in one line.
- When user wants to reply to someone, call draft_reply with the thread_id — the UI will show an editable draft with Send button. Do NOT paste the draft body in your reply.
- Never invent numbers or lead names — if you didn't call a tool for it, say you don't have that data.

${APP_MAP}`;

type ChatMsg =
  | { role: "system" | "user" | "assistant"; content: string; tool_calls?: ToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string };
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

// ---------------- Tool schemas (OpenAI-compatible) ----------------
const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_stats",
      description:
        "Get real-time counts across the workspace: total leads, hot/warm/cold, unread inbox, open tasks, threads received today/this week.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_leads",
      description:
        "List leads. Filter by manual status and/or pipeline stage. Returns email, name, company, status, stage, score.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["hot", "warm", "cold", "not-interested", "any"] },
          stage: {
            type: "string",
            enum: ["open", "contacted", "meeting", "won", "lost", "churned", "any"],
          },
          limit: { type: "number", description: "Max results, default 20, max 50" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_lead_status",
      description:
        "Mark a lead as hot/warm/cold/not-interested. Match by email (preferred) or name substring.",
      parameters: {
        type: "object",
        properties: {
          match: { type: "string", description: "Email address or name to match" },
          status: {
            type: "string",
            enum: ["hot", "warm", "cold", "not-interested"],
          },
        },
        required: ["match", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_lead_stage",
      description: "Update pipeline stage for a lead. Match by email or name.",
      parameters: {
        type: "object",
        properties: {
          match: { type: "string" },
          stage: {
            type: "string",
            enum: ["open", "contacted", "meeting", "won", "lost", "churned"],
          },
        },
        required: ["match", "stage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List tasks (open by default). Returns id, title, priority, due, linked_to.",
      parameters: {
        type: "object",
        properties: {
          include_done: { type: "boolean" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description: "Mark a task done. Match by id (preferred) or title substring.",
      parameters: {
        type: "object",
        properties: { match: { type: "string" } },
        required: ["match"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recent_threads",
      description:
        "Recent inbox threads (newest first). Returns id, from, company, subject, category, unread, receivedAt.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number" },
          only_unread: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_reply",
      description:
        "Generate an editable email reply draft for a thread. The UI will show it with Send button. Use when user says 'reply to X', 'draft a follow up', etc.",
      parameters: {
        type: "object",
        properties: {
          thread_match: {
            type: "string",
            description: "Thread id, sender email, or company name",
          },
          intent: {
            type: "string",
            description: "What the reply should say (short instruction)",
          },
        },
        required: ["thread_match"],
      },
    },
  },
];

// ---------------- Tool executors ----------------
type Ctx = { supabase: SupabaseClient<Database>; userId: string; workspaceId: string };

type DraftPayload = {
  threadId: string;
  to: string;
  subject: string;
  body: string;
  mailbox: string;
  source: string;
};

async function findLead(ctx: Ctx, match: string) {
  const m = match.trim().toLowerCase();
  // lead_scores lead_key is often email or name; try both
  const { data } = await ctx.supabase
    .from("lead_scores")
    .select("lead_key, score, manual_status, stage")
    .eq("workspace_id", ctx.workspaceId);
  const rows = data ?? [];
  const exact = rows.find((r) => r.lead_key?.toLowerCase() === m);
  if (exact) return exact.lead_key;
  const partial = rows.find((r) => r.lead_key?.toLowerCase().includes(m));
  if (partial) return partial.lead_key;
  // fallback: use match itself as lead_key
  return match.trim();
}

async function execGetStats(ctx: Ctx) {
  const [scores, tasks, threads] = await Promise.all([
    ctx.supabase
      .from("lead_scores")
      .select("manual_status, stage, score")
      .eq("workspace_id", ctx.workspaceId),
    ctx.supabase
      .from("tasks")
      .select("id, done, priority, created_at")
      .eq("workspace_id", ctx.workspaceId),
    ctx.supabase
      .from("email_threads")
      .select("id, last_received_at")
      .eq("workspace_id", ctx.workspaceId)
      .order("last_received_at", { ascending: false })
      .limit(500),
  ]);
  const s = (scores.data ?? []) as Array<{ manual_status: string | null; stage: string | null; score: number | null }>;
  const bucket = (r: { manual_status: string | null; score: number | null }) => {
    if (r.manual_status) return r.manual_status;
    if ((r.score ?? 0) >= 80) return "hot";
    if ((r.score ?? 0) >= 60) return "warm";
    if ((r.score ?? 0) > 0) return "cold";
    return "unscored";
  };
  const now = Date.now();
  const day = 86_400_000;
  const t = (threads.data ?? []) as Array<{ last_received_at: string | null }>;
  return {
    total_leads: s.length,
    hot: s.filter((r) => bucket(r) === "hot").length,
    warm: s.filter((r) => bucket(r) === "warm").length,
    cold: s.filter((r) => bucket(r) === "cold").length,
    not_interested: s.filter((r) => r.manual_status === "not-interested").length,
    by_stage: Object.fromEntries(
      ["open", "contacted", "meeting", "won", "lost", "churned"].map((st) => [
        st,
        s.filter((r) => r.stage === st).length,
      ]),
    ),
    total_threads: t.length,
    threads_today: t.filter(
      (r) => r.last_received_at && now - new Date(r.last_received_at).getTime() < day,
    ).length,
    threads_this_week: t.filter(
      (r) => r.last_received_at && now - new Date(r.last_received_at).getTime() < 7 * day,
    ).length,
    open_tasks: (tasks.data ?? []).filter((r) => !r.done).length,
    completed_tasks: (tasks.data ?? []).filter((r) => r.done).length,
  };
}

async function execListLeads(
  ctx: Ctx,
  args: { status?: string; stage?: string; limit?: number },
) {
  const limit = Math.min(args.limit ?? 20, 50);
  let q = ctx.supabase
    .from("lead_scores")
    .select("lead_key, score, reason, manual_status, stage")
    .eq("workspace_id", ctx.workspaceId)
    .order("score", { ascending: false })
    .limit(limit);
  if (args.status && args.status !== "any") q = q.eq("manual_status", args.status);
  if (args.stage && args.stage !== "any") q = q.eq("stage", args.stage);
  const { data, error } = await q;
  if (error) throw error;
  return { leads: data ?? [] };
}

async function execSetStatus(ctx: Ctx, args: { match: string; status: string }) {
  const key = await findLead(ctx, args.match);
  const { error } = await ctx.supabase.from("lead_scores").upsert(
    {
      workspace_id: ctx.workspaceId,
      lead_key: key,
      score: 0,
      reason: "",
      manual_status: args.status,
    } as never,
    { onConflict: "workspace_id,lead_key" },
  );
  if (error) throw error;
  return { ok: true, lead: key, status: args.status };
}

async function execSetStage(ctx: Ctx, args: { match: string; stage: string }) {
  const key = await findLead(ctx, args.match);
  const { error } = await ctx.supabase.from("lead_scores").upsert(
    {
      workspace_id: ctx.workspaceId,
      lead_key: key,
      score: 0,
      reason: "",
      stage: args.stage,
    } as never,
    { onConflict: "workspace_id,lead_key" },
  );
  if (error) throw error;
  return { ok: true, lead: key, stage: args.stage };
}

async function execListTasks(
  ctx: Ctx,
  args: { include_done?: boolean; limit?: number },
) {
  const limit = Math.min(args.limit ?? 20, 50);
  let q = ctx.supabase
    .from("tasks")
    .select("id, title, priority, due, linked_to, done, source")
    .eq("workspace_id", ctx.workspaceId)
    .order("done", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!args.include_done) q = q.eq("done", false);
  const { data, error } = await q;
  if (error) throw error;
  return { tasks: data ?? [] };
}

async function execCompleteTask(ctx: Ctx, args: { match: string }) {
  const m = args.match.trim();
  const isUuid = /^[0-9a-f-]{36}$/i.test(m);
  let id = m;
  if (!isUuid) {
    const { data } = await ctx.supabase
      .from("tasks")
      .select("id, title")
      .eq("workspace_id", ctx.workspaceId)
      .eq("done", false)
      .limit(50);
    const hit = (data ?? []).find((t) =>
      t.title?.toLowerCase().includes(m.toLowerCase()),
    );
    if (!hit) return { ok: false, error: "Task not found" };
    id = hit.id;
  }
  const { error } = await ctx.supabase
    .from("tasks")
    .update({ done: true })
    .eq("id", id)
    .eq("workspace_id", ctx.workspaceId);
  if (error) throw error;
  return { ok: true, id };
}

async function execListRecentThreads(
  ctx: Ctx,
  args: { limit?: number; only_unread?: boolean },
) {
  const limit = Math.min(args.limit ?? 10, 30);
  void args.only_unread; // no is_unread column; ignore for now
  const { data, error } = await ctx.supabase
    .from("email_threads")
    .select("id, contact_email, subject, category, priority, last_received_at, mailbox")
    .eq("workspace_id", ctx.workspaceId)
    .order("last_received_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return { threads: data ?? [] };
}

async function findThread(ctx: Ctx, match: string) {
  const m = match.trim().toLowerCase();
  const { data } = await ctx.supabase
    .from("email_threads")
    .select("id, contact_email, subject, last_body, mailbox")
    .eq("workspace_id", ctx.workspaceId)
    .order("last_received_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as Array<{
    id: string;
    contact_email: string | null;
    subject: string | null;
    last_body: string | null;
    mailbox: string | null;
  }>;
  const exact = rows.find((r) => r.id === match);
  if (exact) return exact;
  return (
    rows.find(
      (r) =>
        r.contact_email?.toLowerCase().includes(m) ||
        r.subject?.toLowerCase().includes(m),
    ) ?? null
  );
}

async function execDraftReply(
  ctx: Ctx,
  args: { thread_match: string; intent?: string },
  key: string,
): Promise<{ ok: boolean; draft?: DraftPayload; error?: string }> {
  const thread = await findThread(ctx, args.thread_match);
  if (!thread) return { ok: false, error: "Thread not found" };

  const system =
    'You are a B2B sales rep writing reply emails. Output ONLY the email body — no subject, no headers, no explanation. Keep it warm and brief (under 90 words).';
  const user = `Reply to ${thread.contact_email ?? "the sender"}.
Subject: ${thread.subject ?? ""}
Their message:
${(thread.last_body ?? "").slice(0, 1500)}

${args.intent ? `Intent: ${args.intent}` : "Write a warm follow-up moving the conversation forward."}`;

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) return { ok: false, error: `Draft failed (${res.status})` };
  const j = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const body = j.choices?.[0]?.message?.content?.trim() ?? "";
  return {
    ok: true,
    draft: {
      threadId: thread.id,
      to: thread.contact_email ?? "",
      subject: thread.subject?.startsWith("Re:")
        ? thread.subject
        : `Re: ${thread.subject ?? ""}`,
      body,
      mailbox: thread.mailbox ?? "",
      source: "instantly",
    },
  };
}

async function runTool(ctx: Ctx, name: string, argsRaw: string, apiKey: string) {
  let args: Record<string, unknown> = {};
  try {
    args = argsRaw ? JSON.parse(argsRaw) : {};
  } catch {
    return { error: "Invalid tool arguments" };
  }
  try {
    switch (name) {
      case "get_stats":
        return await execGetStats(ctx);
      case "list_leads":
        return await execListLeads(ctx, args as never);
      case "set_lead_status":
        return await execSetStatus(ctx, args as never);
      case "set_lead_stage":
        return await execSetStage(ctx, args as never);
      case "list_tasks":
        return await execListTasks(ctx, args as never);
      case "complete_task":
        return await execCompleteTask(ctx, args as never);
      case "list_recent_threads":
        return await execListRecentThreads(ctx, args as never);
      case "draft_reply":
        return await execDraftReply(ctx, args as never, apiKey);
      default:
        return { error: `Unknown tool ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Tool failed" };
  }
}

// ---------------- Main handler ----------------
const AskInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .min(1)
    .max(30),
  context: z
    .object({
      route: z.string().optional(),
    })
    .optional(),
});

type ToolActivity = {
  name: string;
  argsJson: string;
  ok: boolean;
  summary: string;
};

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => AskInput.parse(raw))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Assistant unavailable — missing AI key");

    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found");
    const ctx: Ctx = { supabase: context.supabase, userId: context.userId, workspaceId };

    const routeLine = data.context?.route
      ? `\nUser is currently on: ${data.context.route}`
      : "";

    const messages: ChatMsg[] = [
      { role: "system", content: SYSTEM + routeLine },
      ...data.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const activity: ToolActivity[] = [];
    let draft: DraftPayload | null = null;
    const MAX_STEPS = 6;

    for (let step = 0; step < MAX_STEPS; step++) {
      const res = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({ model: MODEL, messages, tools: TOOLS, tool_choice: "auto" }),
      });
      if (!res.ok) {
        const t = await res.text();
        if (res.status === 429) throw new Error("Assistant busy — try again in a moment.");
        if (res.status === 402) throw new Error("AI credits exhausted.");
        throw new Error(`Assistant error (${res.status}): ${t.slice(0, 200)}`);
      }
      const json = (await res.json()) as {
        choices: Array<{
          message: {
            role: "assistant";
            content: string | null;
            tool_calls?: ToolCall[];
          };
        }>;
      };
      const msg = json.choices?.[0]?.message;
      if (!msg) throw new Error("Empty assistant response");

      const toolCalls = msg.tool_calls ?? [];
      if (toolCalls.length === 0) {
        return {
          reply: msg.content?.trim() ?? "",
          activity,
          draft,
        };
      }

      messages.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        const result = await runTool(ctx, tc.function.name, tc.function.arguments, key);
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          /* noop */
        }
        const ok = !(result && typeof result === "object" && "error" in result);
        activity.push({
          name: tc.function.name,
          argsJson: JSON.stringify(args),
          ok,
          summary: summarize(tc.function.name, args, result),
        });
        if (
          tc.function.name === "draft_reply" &&
          result &&
          typeof result === "object" &&
          "draft" in result &&
          (result as { draft?: DraftPayload }).draft
        ) {
          draft = (result as { draft: DraftPayload }).draft;
        }
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result).slice(0, 4000),
        });
      }
    }

    return {
      reply: "Bahut steps ho gaye — thoda specific poocho.",
      activity,
      draft,
    };
  });

function summarize(name: string, args: Record<string, unknown>, result: unknown): string {
  if (result && typeof result === "object" && "error" in result)
    return String((result as { error: string }).error);
  switch (name) {
    case "set_lead_status":
      return `Marked ${args.match} as ${args.status}`;
    case "set_lead_stage":
      return `Moved ${args.match} to ${args.stage}`;
    case "complete_task":
      return `Task completed`;
    case "draft_reply":
      return `Draft ready`;
    case "get_stats":
      return `Fetched workspace stats`;
    case "list_leads":
      return `Listed ${(result as { leads?: unknown[] }).leads?.length ?? 0} leads`;
    case "list_tasks":
      return `Listed ${(result as { tasks?: unknown[] }).tasks?.length ?? 0} tasks`;
    case "list_recent_threads":
      return `Listed ${(result as { threads?: unknown[] }).threads?.length ?? 0} threads`;
    default:
      return name;
  }
}

// (Drafts are sent from the UI via sendInstantlyReply directly.)
