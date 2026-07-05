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
