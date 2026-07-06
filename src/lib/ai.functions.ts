import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callGateway(messages: Array<{ role: string; content: string }>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit hit. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings.");
    throw new Error(`AI Gateway error (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

const ReplyInput = z.object({
  from: z.string(),
  company: z.string(),
  subject: z.string(),
  body: z.string(),
  senderName: z.string().default("Jane"),
  tone: z.enum(["warm", "direct", "formal"]).default("warm"),
  length: z.enum(["brief", "medium", "detailed"]).default("brief"),
  instructions: z.string().optional(),
});

export const generateReply = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => ReplyInput.parse(raw))
  .handler(async ({ data }) => {
    const system = `You are an elite B2B sales rep writing reply emails for cold outreach. Write only the email body — no subject line, no headers, no explanations. Sign off as "${data.senderName}".`;
    const user = `Incoming email from ${data.from} at ${data.company}.
Subject: ${data.subject}

--- Their message ---
${data.body}
--- End ---

Write a ${data.length}, ${data.tone} reply.${data.instructions ? ` Extra instructions: ${data.instructions}` : ""}`;

    const text = await callGateway([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    return { text };
  });

const SummaryInput = z.object({
  from: z.string(),
  company: z.string(),
  subject: z.string(),
  body: z.string(),
});

export const summarizeThread = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => SummaryInput.parse(raw))
  .handler(async ({ data }) => {
    const system =
      "You analyze sales reply emails. Output ONE crisp sentence (max 25 words): intent, buying signal, and suggested next action. No preamble.";
    const user = `From: ${data.from} (${data.company})
Subject: ${data.subject}
Body: ${data.body}`;
    const text = await callGateway([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    return { summary: text };
  });

const ScoreInput = z.object({
  name: z.string(),
  email: z.string(),
  company: z.string(),
  title: z.string(),
  status: z.string(),
  lastActivity: z.string(),
});

export const scoreLead = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => ScoreInput.parse(raw))
  .handler(async ({ data }) => {
    const system =
      'You are a B2B sales lead scorer. Respond ONLY with compact JSON: {"score": <0-100 integer>, "reason": "<max 12 words>"}. No markdown, no prose.';
    const user = `Contact: ${data.name} — ${data.title} at ${data.company} (${data.email}).
Pipeline status: ${data.status}. Last activity: ${data.lastActivity}.
Score buying intent + fit.`;
    const raw = await callGateway([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned) as { score: number; reason: string };
      const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
      return { score, reason: String(parsed.reason ?? "").slice(0, 120) };
    } catch {
      return { score: 0, reason: "Could not parse AI response" };
    }
  });

const BriefingInput = z.object({
  senderName: z.string().default("there"),
  unreadCount: z.number().int().nonnegative(),
  hotThreads: z
    .array(
      z.object({
        from: z.string(),
        company: z.string(),
        subject: z.string(),
        category: z.string(),
      }),
    )
    .max(10),
  openTasks: z
    .array(z.object({ title: z.string(), priority: z.string() }))
    .max(10),
  metrics: z
    .object({
      sent: z.number().optional(),
      replies: z.number().optional(),
      opportunities: z.number().optional(),
    })
    .optional(),
});

export const generateDailyBriefing = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => BriefingInput.parse(raw))
  .handler(async ({ data }) => {
    const system =
      "You are an executive assistant writing a crisp morning briefing for a B2B sales rep. Output ONLY 3–5 short bullet points in markdown (use '- '), max 18 words each. Lead with the single most urgent action. Reference names/companies. No preamble, no sign-off, no headings.";
    const user = `Rep: ${data.senderName}
Unread replies: ${data.unreadCount}
Hot threads:
${data.hotThreads.map((t) => `- ${t.from} @ ${t.company} — ${t.category} — "${t.subject}"`).join("\n") || "- none"}
Open tasks:
${data.openTasks.map((t) => `- [${t.priority}] ${t.title}`).join("\n") || "- none"}
Metrics: sent=${data.metrics?.sent ?? 0} replies=${data.metrics?.replies ?? 0} opportunities=${data.metrics?.opportunities ?? 0}`;

    const text = await callGateway([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    return { briefing: text };
  });

const PriorityActionsInput = BriefingInput;

export type PriorityAction = {
  priority: number; // 1 = most important
  title: string; // Imperative action, max ~10 words
  reason: string; // Why this matters — explainable, references data
  signals: string[]; // Short evidence tags e.g. ["hot lead", "3d silent"]
  category: "reply" | "task" | "followup" | "review";
  target?: string; // Who / what (e.g. "Alex @ Acme")
  urgency: "now" | "today" | "this_week";
};

export const generatePriorityActions = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => PriorityActionsInput.parse(raw))
  .handler(async ({ data }) => {
    const system = `You are a B2B sales chief-of-staff. Rank the rep's most valuable next actions.
Output STRICT JSON only, no markdown fences:
{"headline":"<one sentence, max 20 words, no emoji>",
 "actions":[
  {"priority":1,"title":"<imperative, max 10 words>","reason":"<why now, cite the data, max 25 words>","signals":["<tag>","<tag>"],"category":"reply|task|followup|review","target":"<person @ company or task name>","urgency":"now|today|this_week"}
 ]}
Return 3–5 actions, sorted by priority (1 = most urgent). Reasons must be explainable and reference specific names, categories, or metrics from the input. No preamble, no trailing text.`;

    const user = `Rep: ${data.senderName}
Unread replies: ${data.unreadCount}
Hot threads:
${data.hotThreads.map((t) => `- ${t.from} @ ${t.company} — ${t.category} — "${t.subject}"`).join("\n") || "- none"}
Open tasks:
${data.openTasks.map((t) => `- [${t.priority}] ${t.title}`).join("\n") || "- none"}
Metrics: sent=${data.metrics?.sent ?? 0} replies=${data.metrics?.replies ?? 0} opportunities=${data.metrics?.opportunities ?? 0}`;

    const raw = await callGateway([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned) as {
        headline: string;
        actions: PriorityAction[];
      };
      const actions = (parsed.actions ?? [])
        .filter((a) => a && typeof a.title === "string")
        .slice(0, 6)
        .map((a, i) => ({
          priority: Number(a.priority) || i + 1,
          title: String(a.title).slice(0, 120),
          reason: String(a.reason ?? "").slice(0, 240),
          signals: Array.isArray(a.signals) ? a.signals.slice(0, 4).map(String) : [],
          category: (["reply", "task", "followup", "review"] as const).includes(
            a.category as PriorityAction["category"],
          )
            ? (a.category as PriorityAction["category"])
            : "review",
          target: a.target ? String(a.target).slice(0, 80) : undefined,
          urgency: (["now", "today", "this_week"] as const).includes(
            a.urgency as PriorityAction["urgency"],
          )
            ? (a.urgency as PriorityAction["urgency"])
            : "today",
        }))
        .sort((a, b) => a.priority - b.priority);
      return {
        headline: String(parsed.headline ?? "").slice(0, 200),
        actions,
      };
    } catch {
      return { headline: "", actions: [] as PriorityAction[] };
    }
  });


