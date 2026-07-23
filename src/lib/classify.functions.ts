import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

export const AI_CATEGORIES = [
  "pricing_request",
  "quotation",
  "demo_request",
  "meeting_request",
  "interested",
  "very_interested",
  "pickup_request",
  "inspection_request",
  "rental_inquiry",
  "amc_inquiry",
  "itad_inquiry",
  "itam_inquiry",
  "laptop_purchase",
  "refurbished_devices",
  "complaint",
  "support",
  "spam",
  "out_of_office",
  "wrong_person",
  "auto_reply",
  "unknown",
] as const;

export const AI_NEXT_ACTIONS = [
  "reply_immediately",
  "schedule_demo",
  "call_customer",
  "send_pricing",
  "send_proposal",
  "schedule_pickup",
  "assign_engineer",
  "assign_sales",
  "wait",
  "archive",
  "mark_spam",
] as const;

export type AiCategory = (typeof AI_CATEGORIES)[number];
export type AiNextAction = (typeof AI_NEXT_ACTIONS)[number];

export const CATEGORY_LABELS: Record<AiCategory, string> = {
  pricing_request: "Pricing Request",
  quotation: "Quotation",
  demo_request: "Demo Request",
  meeting_request: "Meeting Request",
  interested: "Interested",
  very_interested: "Very Interested",
  pickup_request: "Pickup Request",
  inspection_request: "Inspection Request",
  rental_inquiry: "Rental Inquiry",
  amc_inquiry: "AMC Inquiry",
  itad_inquiry: "ITAD Inquiry",
  itam_inquiry: "ITAM Inquiry",
  laptop_purchase: "Laptop Purchase",
  refurbished_devices: "Refurbished Devices",
  complaint: "Complaint",
  support: "Support",
  spam: "Spam",
  out_of_office: "Out of Office",
  wrong_person: "Wrong Person",
  auto_reply: "Auto Reply",
  unknown: "Unknown",
};

export const NEXT_ACTION_LABELS: Record<AiNextAction, string> = {
  reply_immediately: "Reply Immediately",
  schedule_demo: "Schedule Demo",
  call_customer: "Call Customer",
  send_pricing: "Send Pricing",
  send_proposal: "Send Proposal",
  schedule_pickup: "Schedule Pickup",
  assign_engineer: "Assign Engineer",
  assign_sales: "Assign Sales",
  wait: "Wait",
  archive: "Archive",
  mark_spam: "Mark Spam",
};

const ThreadMsgInput = z.object({
  direction: z.enum(["in", "out"]),
  from: z.string().optional().default(""),
  to: z.string().optional().default(""),
  at: z.string().optional().default(""),
  body: z.string().max(2000).optional().default(""),
});

const ClassifyInput = z.object({
  from: z.string(),
  company: z.string().optional().default(""),
  subject: z.string(),
  body: z.string().max(6000),
  // Optional thread context — when provided, the model reasons across the
  // whole conversation and knows which mailboxes on our side have replied.
  ourMailboxes: z.array(z.string()).optional(),
  thread: z.array(ThreadMsgInput).max(20).optional(),
});

export type ClassifyResult = {
  category: AiCategory;
  confidence: number; // 0..1
  reason: string;
  next_action: AiNextAction;
  next_action_reason: string;
  priority: "hot" | "warm" | "cold";
  signals: string[];
  who_replied_last?: "customer" | "us" | "auto" | "unknown";
  our_reply_quality?: "good" | "needs_followup" | "missed_question" | "n/a";
  risks?: string[];
  suggested_reply?: string;
};

const FALLBACK: ClassifyResult = {
  category: "unknown",
  confidence: 0,
  reason: "AI response could not be parsed.",
  next_action: "wait",
  next_action_reason: "Review manually.",
  priority: "cold",
  signals: [],
  who_replied_last: "unknown",
  our_reply_quality: "n/a",
  risks: [],
  suggested_reply: "",
};

export const classifyEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ClassifyInput.parse(raw))
  .handler(async ({ data }): Promise<ClassifyResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const system = `You are an expert B2B email intent classifier and conversation analyst for an IT-services / device-lifecycle company (rentals, AMC, ITAD, ITAM, refurbished laptops, pickups, inspections, demos, sales).

You will be given (1) the latest inbound email and, when available, (2) the full thread history with each message tagged as "in" (customer → us) or "out" (us → customer). "Us" may reply from ANY of our mailboxes (e.g. asset.purchase@, procurement@greenspark, sales@) — treat every "out" message as our team, one conversation, even if the From changes. Do NOT flag mailbox switches as new persons.

Classify INTENT based on CONTEXT, not keywords. Distinguish, for example:
- pricing_request (asking cost/rates) vs quotation (formal quote doc)
- demo_request vs meeting_request
- interested (mild) vs very_interested (strong buying signal: dates, budget, urgency)
- pickup_request vs inspection_request
- out_of_office / auto_reply / wrong_person / spam → non-actionable

PRIORITY RUBRIC (strict — do not inflate to hot):
- HOT — explicit buying signal: demo, quote, pricing, meeting, PO, contract, dates, budget, "when can we start", "send proposal", "book a call".
- WARM — engaged but no buying signal yet: clarifying questions, "tell me more", non-committal replies.
- COLD — auto-reply, OOO, unsubscribe, "not interested", bounce, wrong person, spam.

REPLY QUALITY (only when thread has ≥1 "out" message):
- who_replied_last = "customer" | "us" | "auto" | "unknown".
- our_reply_quality:
  * "good" — our last "out" message directly answered the customer's questions.
  * "needs_followup" — we replied but a follow-up is expected (waiting on customer decision).
  * "missed_question" — customer asked something concrete and our reply skipped it. List it in risks.
  * "n/a" — no "out" messages yet or not applicable.
- risks: short strings like "warranty terms not answered", "timeline not confirmed".
- suggested_reply: one short paragraph the user can send now, tuned to the CURRENT conversation state. Skip if next_action is wait/archive/mark_spam.

Return STRICT JSON only, no prose, no markdown fences. Schema:
{
  "category": one of [${AI_CATEGORIES.join(", ")}],
  "confidence": number 0.0-1.0,
  "reason": string (max 30 words, cite the phrase or signal),
  "next_action": one of [${AI_NEXT_ACTIONS.join(", ")}],
  "next_action_reason": string (max 20 words),
  "priority": one of [hot, warm, cold],
  "signals": array of up to 4 short evidence tags (max 4 words each),
  "who_replied_last": "customer" | "us" | "auto" | "unknown",
  "our_reply_quality": "good" | "needs_followup" | "missed_question" | "n/a",
  "risks": array of up to 3 short strings,
  "suggested_reply": string (max 80 words, plain text)
}`;

    const ourMailboxes = (data.ourMailboxes ?? []).filter(Boolean).join(", ");
    const threadBlock =
      data.thread && data.thread.length
        ? "\n\nThread history (oldest → newest):\n" +
          data.thread
            .map(
              (m, i) =>
                `#${i + 1} [${m.direction === "in" ? "CUSTOMER" : "US"}] ${m.at ? m.at + " " : ""}${m.from ? `from ${m.from} ` : ""}${m.to ? `to ${m.to}` : ""}\n${(m.body ?? "").slice(0, 1200)}`,
            )
            .join("\n---\n")
        : "";

    const user = `${ourMailboxes ? `Our mailboxes: ${ourMailboxes}\n` : ""}Latest inbound:
From: ${data.from}${data.company ? ` (${data.company})` : ""}
Subject: ${data.subject}
Body:
${data.body.slice(0, 5000)}${threadBlock}`;

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit hit. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings.");
      const text = await res.text();
      throw new Error(`AI Gateway error (${res.status}): ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned) as Partial<ClassifyResult>;
      const category = (AI_CATEGORIES as readonly string[]).includes(parsed.category ?? "")
        ? (parsed.category as AiCategory)
        : "unknown";
      const next_action = (AI_NEXT_ACTIONS as readonly string[]).includes(parsed.next_action ?? "")
        ? (parsed.next_action as AiNextAction)
        : "wait";
      const priorityRaw = String(parsed.priority ?? "cold").toLowerCase();
      const priority: ClassifyResult["priority"] =
        priorityRaw === "hot" ? "hot" : priorityRaw === "warm" ? "warm" : "cold";
      const whoRaw = String(parsed.who_replied_last ?? "unknown").toLowerCase();
      const who_replied_last = (["customer", "us", "auto", "unknown"] as const).includes(
        whoRaw as never,
      )
        ? (whoRaw as ClassifyResult["who_replied_last"])
        : "unknown";
      const qualRaw = String(parsed.our_reply_quality ?? "n/a").toLowerCase();
      const our_reply_quality = (
        ["good", "needs_followup", "missed_question", "n/a"] as const
      ).includes(qualRaw as never)
        ? (qualRaw as ClassifyResult["our_reply_quality"])
        : "n/a";
      return {
        category,
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
        reason: String(parsed.reason ?? "").slice(0, 240),
        next_action,
        next_action_reason: String(parsed.next_action_reason ?? "").slice(0, 160),
        priority,
        signals: Array.isArray(parsed.signals)
          ? parsed.signals.slice(0, 4).map((s) => String(s).slice(0, 40))
          : [],
        who_replied_last,
        our_reply_quality,
        risks: Array.isArray(parsed.risks)
          ? parsed.risks.slice(0, 3).map((s) => String(s).slice(0, 120))
          : [],
        suggested_reply: String(parsed.suggested_reply ?? "").slice(0, 600),
      };
    } catch {
      return FALLBACK;
    }
  });
