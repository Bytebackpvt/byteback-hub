import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const APP_MAP = `The user is inside ByteBack — a unified sales inbox + CRM. Sections:
- Dashboard (/app): daily briefing, hot threads, priority actions.
- Opportunity Radar (/app/radar): AI-detected buying signals across inboxes.
- Inbox (/app/inbox): unified email replies from Gmail + Instantly, classified.
- Contacts (/app/crm): every lead, AI score, manual hot/warm/cold + pipeline stage.
- Pipeline (/app/pipeline): kanban board of deals across stages.
- Tasks (/app/tasks): follow-up tasks auto-created from replies.
- Analytics (/app/analytics): sent, opens, replies, opportunities trend.
- Team (/app/team): invite teammates, manage roles.
- Integrations (/app/integrations): connect Instantly, Gmail, Sheets, webhooks.
- Email Sources (/app/email-sources): manage mailboxes.
- Notifications (/app/notifications): alert history + preferences.
- AI Memory (/app/memory): what the AI remembers about your business.
- Settings (/app/settings/account): profile, security.

Lead statuses: hot / warm / cold / not-interested (users can set manually on the Contacts page — click the status pill).
Pipeline stages: open / contacted / meeting / won / lost / churned (set on Contacts or drag on Pipeline board).`;

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
      stats: z
        .object({
          totalLeads: z.number().optional(),
          hotLeads: z.number().optional(),
          warmLeads: z.number().optional(),
          coldLeads: z.number().optional(),
          unreadInbox: z.number().optional(),
          openTasks: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => AskInput.parse(raw))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Assistant unavailable — missing AI key");

    const ctxLines: string[] = [];
    if (data.context?.route) ctxLines.push(`User is currently on: ${data.context.route}`);
    if (data.context?.stats) {
      const s = data.context.stats;
      ctxLines.push(
        `Workspace snapshot — total leads: ${s.totalLeads ?? "?"}, hot: ${s.hotLeads ?? 0}, warm: ${s.warmLeads ?? 0}, cold: ${s.coldLeads ?? 0}, unread inbox: ${s.unreadInbox ?? 0}, open tasks: ${s.openTasks ?? 0}.`,
      );
    }

    const system = `You are ByteBack Assistant — a helpful in-app guide. You answer in the same language the user writes in (English, Hindi, Hinglish — mirror them). Keep replies under 80 words, use plain markdown, no headings. If a question needs an action the user must take manually (e.g. "mark X as hot"), tell them the exact button/section to click. If the user asks about numbers you don't have, tell them where to see it. Never invent data.

${APP_MAP}

${ctxLines.join("\n")}`;

    const messages = [
      { role: "system", content: system },
      ...data.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({ model: MODEL, messages }),
    });
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Assistant busy — try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`Assistant error (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    const reply = json.choices?.[0]?.message?.content?.trim() ?? "";
    return { reply };
  });
