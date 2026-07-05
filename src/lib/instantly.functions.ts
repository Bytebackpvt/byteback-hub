import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BASE = "https://api.instantly.ai/api/v2";

function getKey() {
  const key = process.env.INSTANTLY_API_KEY;
  if (!key) throw new Error("Missing INSTANTLY_API_KEY");
  return key;
}

async function instantly<T>(
  path: string,
  init?: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> },
): Promise<T> {
  const url = new URL(BASE + path);
  if (init?.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export type InstantlyThread = {
  id: string;
  from: { name: string; email: string; company: string };
  subject: string;
  preview: string;
  body: string;
  mailbox: string;
  receivedAt: string;
  unread: boolean;
  category:
    | "interested"
    | "meeting"
    | "objection"
    | "not-now"
    | "not-interested"
    | "ooo"
    | "unsubscribe"
    | "spam";
  priority: "hot" | "warm" | "low";
  campaign?: string;
};

export type InstantlyMailbox = { id: string; email: string; status: string };

// Instantly's unified inbox: GET /api/v2/emails
// Response shape (per docs): { items: [...], next_starting_after?: string }
type RawEmail = {
  id: string;
  from_address_email?: string;
  from_address_json?: Array<{ name?: string; address?: string }>;
  to_address_email_list?: string;
  subject?: string;
  body?: { text?: string; html?: string };
  timestamp_created?: string;
  timestamp_email?: string;
  is_unread?: boolean;
  is_focused?: boolean;
  ai_interest_value?: number; // 1..4 lead-interest score
  campaign_id?: string;
  eaccount?: string; // sending mailbox address
  thread_id?: string;
};

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function companyFromEmail(email?: string) {
  if (!email) return "";
  const domain = email.split("@")[1] ?? "";
  const root = domain.split(".")[0] ?? "";
  return root.charAt(0).toUpperCase() + root.slice(1);
}

// Very light heuristic to bucket a reply by keywords when Instantly hasn't
// labeled it. Instantly's ai_interest_value is 1=Very interested … 4=Not interested.
function classify(subject: string, body: string, interest?: number): InstantlyThread["category"] {
  const t = `${subject} ${body}`.toLowerCase();
  if (/unsubscribe|remove me|opt.?out/.test(t)) return "unsubscribe";
  if (/out of (the )?office|on vacation|on leave|ooo\b/.test(t)) return "ooo";
  if (/(book|schedule|calendar|meeting|call).{0,40}(time|slot|when)/.test(t) || /calendly|book a call/.test(t))
    return "meeting";
  if (interest === 1) return "interested";
  if (interest === 2) return "not-now";
  if (interest === 3) return "objection";
  if (interest === 4) return "not-interested";
  if (/pricing|demo|interested|tell me more|sounds good/.test(t)) return "interested";
  if (/not interested|no thanks|not a fit/.test(t)) return "not-interested";
  if (/later|next quarter|revisit|circle back|not now/.test(t)) return "not-now";
  if (/but|however|concern|expensive|budget/.test(t)) return "objection";
  return "interested";
}

function priorityFrom(cat: InstantlyThread["category"], interest?: number): InstantlyThread["priority"] {
  if (cat === "meeting" || interest === 1) return "hot";
  if (cat === "interested" || interest === 2) return "warm";
  return "low";
}

export const listInstantlyThreads = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const data = await instantly<{ items?: RawEmail[] }>("/emails", {
      query: { limit: 50, email_type: "received" },
    });
    const items = data.items ?? [];
    const threads: InstantlyThread[] = items.map((e) => {
      const fromJson = e.from_address_json?.[0];
      const fromEmail = fromJson?.address ?? e.from_address_email ?? "unknown@unknown";
      const fromName =
        fromJson?.name?.trim() ||
        fromEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const bodyText = e.body?.text ?? (e.body?.html ? stripHtml(e.body.html) : "");
      const cat = classify(e.subject ?? "", bodyText, e.ai_interest_value);
      return {
        id: e.id,
        from: {
          name: fromName,
          email: fromEmail,
          company: companyFromEmail(fromEmail),
        },
        subject: e.subject ?? "(no subject)",
        preview: bodyText.slice(0, 140),
        body: bodyText,
        mailbox: e.eaccount ?? "unknown",
        receivedAt: timeAgo(e.timestamp_email ?? e.timestamp_created),
        unread: Boolean(e.is_unread),
        category: cat,
        priority: priorityFrom(cat, e.ai_interest_value),
        campaign: e.campaign_id,
      };
    });
    return { threads, connected: true as const };
  } catch (err) {
    return {
      threads: [] as InstantlyThread[],
      connected: false as const,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
});

export const listInstantlyMailboxes = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const data = await instantly<{ items?: Array<{ email: string; status?: string; id?: string }> }>(
      "/accounts",
      { query: { limit: 100 } },
    );
    const items = data.items ?? [];
    const mailboxes: InstantlyMailbox[] = items.map((a) => ({
      id: a.email,
      email: a.email,
      status: a.status ?? "active",
    }));
    return { mailboxes, connected: true as const };
  } catch (err) {
    return {
      mailboxes: [] as InstantlyMailbox[],
      connected: false as const,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
});

const ReplyInput = z.object({
  replyToId: z.string().min(1),
  eaccount: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const sendInstantlyReply = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => ReplyInput.parse(raw))
  .handler(async ({ data }) => {
    const res = await instantly<{ id?: string }>("/emails/reply", {
      method: "POST",
      body: {
        reyto_email_id: data.replyToId,
        eaccount: data.eaccount,
        subject: data.subject,
        body: { text: data.body },
      },
    });
    return { ok: true as const, id: res.id };
  });

export type InstantlyLead = {
  id: string;
  email: string;
  name: string;
  company: string;
  title: string;
  status: "new" | "interested" | "meeting" | "customer" | "not-interested" | "bounced";
  lastActivity: string;
  campaign?: string;
};

type RawLead = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  personalization?: string;
  payload?: Record<string, unknown>;
  status?: number;
  lt_interest_status?: number;
  campaign?: string;
  timestamp_last_touch?: string;
  timestamp_created?: string;
};

function leadStatus(s?: number, interest?: number): InstantlyLead["status"] {
  if (interest === 4) return "customer";
  if (interest === 2 || interest === 3) return "meeting";
  if (interest === 1) return "interested";
  if (interest === -1 || interest === -2 || interest === -3) return "not-interested";
  if (s === -1) return "bounced";
  return "new";
}

export const listInstantlyLeads = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const data = await instantly<{ items?: RawLead[] }>("/leads/list", {
      method: "POST",
      body: { limit: 100 },
    });
    const items = data.items ?? [];
    const leads: InstantlyLead[] = items.map((l) => {
      const name =
        [l.first_name, l.last_name].filter(Boolean).join(" ").trim() ||
        l.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const title =
        (l.payload && typeof l.payload.title === "string" ? l.payload.title : "") ||
        (l.payload && typeof l.payload.job_title === "string" ? l.payload.job_title : "") ||
        "";
      return {
        id: l.id,
        email: l.email,
        name,
        company: l.company_name ?? companyFromEmail(l.email),
        title,
        status: leadStatus(l.status, l.lt_interest_status),
        lastActivity: timeAgo(l.timestamp_last_touch ?? l.timestamp_created),
        campaign: l.campaign,
      };
    });
    return { leads, connected: true as const };
  } catch (err) {
    return {
      leads: [] as InstantlyLead[],
      connected: false as const,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
});

