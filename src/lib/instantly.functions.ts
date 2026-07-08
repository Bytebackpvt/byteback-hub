import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE = "https://api.instantly.ai/api/v2";

// Only these accounts (workspace owners) can see the shared Instantly workspace.
// Other users see an empty/not-connected state and must connect their own tool.
const INSTANTLY_ALLOWED_EMAILS = new Set(
  (process.env.INSTANTLY_ALLOWED_EMAILS ?? "anjali@byteback.co.in,abhishek.rathore@byteback.co.in")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

function isInstantlyAllowed(claims: unknown): boolean {
  const email = (claims as { email?: string } | null)?.email?.toLowerCase();
  return !!email && INSTANTLY_ALLOWED_EMAILS.has(email);
}

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
    console.error(`Instantly API error ${res.status} on ${path}: ${text.slice(0, 500)}`);
    if (res.status === 401 || res.status === 403) {
      throw new Error("Email service authentication failed. Please check your API key.");
    }
    if (res.status === 429) {
      throw new Error("Email service rate limit reached. Please try again shortly.");
    }
    if (res.status >= 500) {
      throw new Error("Email service is temporarily unavailable. Please try again later.");
    }
    if (res.status === 400 || res.status === 422) {
      throw new Error("Email service rejected the request.");
    }
    if (res.status === 404) {
      throw new Error("Requested email resource was not found.");
    }
    throw new Error("Email service request failed.");
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

export const listInstantlyThreads = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  if (!isInstantlyAllowed(context.claims)) {
    return { threads: [] as InstantlyThread[], connected: false as const, error: "Not connected" };
  }

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

export const listInstantlyMailboxes = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => {
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

export const sendInstantlyReply = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
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

export const listInstantlyLeads = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => {
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

const STATUS_TO_INTEREST: Record<InstantlyLead["status"], number> = {
  interested: 1,
  meeting: 2,
  customer: 4,
  "not-interested": -1,
  new: 0,
  bounced: 0,
};

const UpdateStatusInput = z.object({
  leadId: z.string().min(1),
  status: z.enum(["new", "interested", "meeting", "customer", "not-interested", "bounced"]),
});

export const updateLeadStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => UpdateStatusInput.parse(raw))
  .handler(async ({ data }) => {
    const interest = STATUS_TO_INTEREST[data.status];
    await instantly("/leads/update-interest-status", {
      method: "POST",
      body: { id: data.leadId, interest_status: interest },
    });
    return { ok: true as const };
  });

export type InstantlyAnalytics = {
  emailsSent: number;
  opens: number;
  replies: number;
  clicks: number;
  bounced: number;
  unsubscribed: number;
  newLeads: number;
  opportunities: number;
  daily: Array<{ date: string; sent: number; opened: number; replied: number }>;
  categoryBreakdown: Array<{ name: string; value: number; color: string }>;
};

type OverviewResponse = {
  open_count?: number;
  reply_count?: number;
  click_count?: number;
  bounced_count?: number;
  unsubscribed_count?: number;
  emails_sent_count?: number;
  new_leads_count?: number;
  total_opportunities?: number;
};

type DailyRow = {
  date: string;
  sent?: number;
  opened?: number;
  unique_opened?: number;
  replies?: number;
  clicks?: number;
};

export const getInstantlyAnalytics = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => {
  try {
    const [overview, dailyRes, leadsRes] = await Promise.all([
      instantly<OverviewResponse>("/campaigns/analytics/overview"),
      instantly<{ items?: DailyRow[] } | DailyRow[]>("/campaigns/analytics/daily", {
        query: { limit: 14 },
      }).catch(() => ({ items: [] as DailyRow[] })),
      instantly<{ items?: RawLead[] }>("/leads/list", {
        method: "POST",
        body: { limit: 500 },
      }).catch(() => ({ items: [] as RawLead[] })),
    ]);

    const dailyItems: DailyRow[] = Array.isArray(dailyRes)
      ? dailyRes
      : (dailyRes.items ?? []);
    const daily = dailyItems.slice(-7).map((d) => ({
      date: new Date(d.date).toLocaleDateString(undefined, { weekday: "short" }),
      sent: d.sent ?? 0,
      opened: d.opened ?? d.unique_opened ?? 0,
      replied: d.replies ?? 0,
    }));

    const leads = leadsRes.items ?? [];
    const buckets = {
      Interested: 0,
      Meeting: 0,
      Won: 0,
      "Not interested": 0,
      Pending: 0,
    };
    for (const l of leads) {
      const i = l.lt_interest_status;
      if (i === 1) buckets.Interested += 1;
      else if (i === 2 || i === 3) buckets.Meeting += 1;
      else if (i === 4) buckets.Won += 1;
      else if (i === -1 || i === -2 || i === -3) buckets["Not interested"] += 1;
      else buckets.Pending += 1;
    }

    const palette: Record<string, string> = {
      Interested: "oklch(0.62 0.22 274)",
      Meeting: "oklch(0.65 0.2 300)",
      Won: "hsl(150 60% 45%)",
      "Not interested": "hsl(0 70% 55%)",
      Pending: "hsl(220 10% 60%)",
    };
    const categoryBreakdown = Object.entries(buckets)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: palette[name] }));

    return {
      connected: true as const,
      analytics: {
        emailsSent: overview.emails_sent_count ?? 0,
        opens: overview.open_count ?? 0,
        replies: overview.reply_count ?? 0,
        clicks: overview.click_count ?? 0,
        bounced: overview.bounced_count ?? 0,
        unsubscribed: overview.unsubscribed_count ?? 0,
        newLeads: overview.new_leads_count ?? 0,
        opportunities: overview.total_opportunities ?? 0,
        daily,
        categoryBreakdown,
      } satisfies InstantlyAnalytics,
    };
  } catch (err) {
    return {
      connected: false as const,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
});



