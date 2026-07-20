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

const ClassifyInput = z.object({
  from: z.string(),
  company: z.string().optional().default(""),
  subject: z.string(),
  body: z.string().max(6000),
});

export type ClassifyResult = {
  category: AiCategory;
  confidence: number; // 0..1
  reason: string;
  next_action: AiNextAction;
  next_action_reason: string;
  priority: "hot" | "warm" | "cold";
  signals: string[];
};

const FALLBACK: ClassifyResult = {
  category: "unknown",
  confidence: 0,
  reason: "AI response could not be parsed.",
  next_action: "wait",
  next_action_reason: "Review manually.",
  priority: "cold",
  signals: [],
};

export const classifyEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ClassifyInput.parse(raw))
  .handler(async ({ data }): Promise<ClassifyResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const system = `You are an expert B2B email intent classifier for an IT-services / device-lifecycle company (rentals, AMC, ITAD, ITAM, refurbished laptops, pickups, inspections, demos, sales).
Read the incoming email and classify INTENT based on CONTEXT, not keywords. Distinguish, for example:
- pricing_request (asking cost/rates) vs quotation (asking for a formal quote doc)
- demo_request vs meeting_request
- interested (mild signal) vs very_interested (strong buying signal, dates/budget/urgency)
- pickup_request vs inspection_request (physical asset handling)
- out_of_office / auto_reply / wrong_person / spam are non-actionable

PRIORITY RUBRIC (be strict — do not inflate to hot):
- HOT — explicit buying signal: asks for a demo, quote, pricing, meeting, PO, contract, dates, budget, "when can we start", "send proposal", "book a call".
- WARM — engaged and curious but NO buying signal yet: asks clarifying questions, wants more info, "tell me more", "how does it work", replies but non-committal.
- COLD — auto-reply, out-of-office, unsubscribe, "not interested", "remove me", bounce, wrong person, spam, or generic acknowledgement with no follow-up needed.

Few-shot examples:
- "Can you send pricing for 50 laptops? Need by Friday." → very_interested, HOT
- "Interesting, tell me more about your ITAD process." → interested, WARM
- "Out of office until Monday." → out_of_office, COLD
- "Please remove me from your list." → wrong_person, COLD
- "Thanks, will review internally." → interested, WARM (not hot — no commitment)

Return STRICT JSON only, no prose, no markdown fences. Schema:
{
  "category": one of [${AI_CATEGORIES.join(", ")}],
  "confidence": number 0.0-1.0,
  "reason": string (max 30 words, cite the phrase or signal),
  "next_action": one of [${AI_NEXT_ACTIONS.join(", ")}],
  "next_action_reason": string (max 20 words),
  "priority": one of [hot, warm, cold],
  "signals": array of up to 4 short evidence tags (max 4 words each)
}`;

    const user = `From: ${data.from}${data.company ? ` (${data.company})` : ""}
Subject: ${data.subject}
Body:
${data.body.slice(0, 5000)}`;

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
      };
    } catch {
      return FALLBACK;
    }
  });
