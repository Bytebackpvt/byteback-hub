import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";

export type WorkspaceAnalytics = {
  range: { days: number; from: string; to: string };
  totals: {
    threads: number;
    hotLeads: number;
    newContacts: number;
    dealsCreated: number;
    dealsWon: number;
    tasksOpen: number;
    tasksDone: number;
    replyRatePct: number;
    avgResponseHours: number | null;
  };
  daily: Array<{ date: string; threads: number; hot: number; contacts: number }>;
  categoryBreakdown: Array<{ name: string; value: number; color: string }>;
  mailboxes: Array<{ mailbox: string; threads: number; hot: number }>;
  pipeline: Array<{ stage: string; count: number }>;
};

const Input = z.object({ days: z.number().int().min(1).max(365).optional() });

const CAT_LABEL: Record<string, string> = {
  meeting_request: "Meeting",
  demo_request: "Demo",
  pricing_request: "Pricing",
  interested: "Interested",
  rental_inquiry: "Rental",
  amc_inquiry: "AMC",
  refurbished_devices: "Refurbished",
  pickup_request: "Pickup",
  out_of_office: "OOO",
  spam: "Spam",
};

const CAT_COLORS = [
  "oklch(0.62 0.22 274)",
  "oklch(0.65 0.2 300)",
  "hsl(150 60% 45%)",
  "hsl(30 85% 55%)",
  "hsl(200 70% 50%)",
  "hsl(340 70% 55%)",
  "hsl(0 70% 55%)",
  "hsl(220 10% 60%)",
];

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
function shortDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export const getWorkspaceAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const days = data.days ?? 30;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const workspaceId = await getCurrentWorkspaceId(sb, context.userId);
    const to = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const empty: WorkspaceAnalytics = {
      range: { days, from: from.toISOString(), to: to.toISOString() },
      totals: {
        threads: 0,
        hotLeads: 0,
        newContacts: 0,
        dealsCreated: 0,
        dealsWon: 0,
        tasksOpen: 0,
        tasksDone: 0,
        replyRatePct: 0,
        avgResponseHours: null,
      },
      daily: [],
      categoryBreakdown: [],
      mailboxes: [],
      pipeline: [],
    };
    if (!workspaceId) return empty;

    const fromIso = from.toISOString();

    const [threadsRes, contactsRes, dealsRes, tasksRes] = await Promise.all([
      sb
        .from("email_threads")
        .select("thread_id, category, priority, mailbox, last_received_at, created_at")
        .eq("workspace_id", workspaceId)
        .gte("last_received_at", fromIso),
      sb
        .from("contacts")
        .select("id, first_seen_at")
        .eq("workspace_id", workspaceId)
        .gte("first_seen_at", fromIso),
      sb
        .from("deals")
        .select("id, stage, created_at")
        .eq("workspace_id", workspaceId)
        .gte("created_at", fromIso),
      sb
        .from("tasks")
        .select("id, done, created_at")
        .eq("workspace_id", workspaceId)
        .gte("created_at", fromIso),
    ]);

    const threads = (threadsRes.data ?? []) as Array<{
      thread_id: string;
      category: string | null;
      priority: string | null;
      mailbox: string | null;
      last_received_at: string | null;
    }>;
    const contacts = (contactsRes.data ?? []) as Array<{ first_seen_at: string | null }>;
    const deals = (dealsRes.data ?? []) as Array<{ stage: string | null; created_at: string | null }>;
    const tasks = (tasksRes.data ?? []) as Array<{ done: boolean | null; created_at: string | null }>;

    // Daily buckets
    const dayMap = new Map<string, { threads: number; hot: number; contacts: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(to.getTime() - i * 24 * 60 * 60 * 1000);
      dayMap.set(ymd(d), { threads: 0, hot: 0, contacts: 0 });
    }
    for (const t of threads) {
      if (!t.last_received_at) continue;
      const key = t.last_received_at.slice(0, 10);
      const b = dayMap.get(key);
      if (b) {
        b.threads += 1;
        if (t.priority === "hot") b.hot += 1;
      }
    }
    for (const c of contacts) {
      if (!c.first_seen_at) continue;
      const key = c.first_seen_at.slice(0, 10);
      const b = dayMap.get(key);
      if (b) b.contacts += 1;
    }
    const daily = [...dayMap.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, v]) => ({ date: shortDay(date), threads: v.threads, hot: v.hot, contacts: v.contacts }));

    // Category breakdown
    const catCount = new Map<string, number>();
    for (const t of threads) {
      const raw = (t.category ?? "other").toString();
      const label = CAT_LABEL[raw] ?? raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      catCount.set(label, (catCount.get(label) ?? 0) + 1);
    }
    const categoryBreakdown = [...catCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value], i) => ({ name, value, color: CAT_COLORS[i % CAT_COLORS.length] }));

    // Mailboxes
    const mailboxMap = new Map<string, { threads: number; hot: number }>();
    for (const t of threads) {
      const mb = t.mailbox ?? "unknown";
      const cur = mailboxMap.get(mb) ?? { threads: 0, hot: 0 };
      cur.threads += 1;
      if (t.priority === "hot") cur.hot += 1;
      mailboxMap.set(mb, cur);
    }
    const mailboxes = [...mailboxMap.entries()]
      .map(([mailbox, v]) => ({ mailbox, ...v }))
      .sort((a, b) => b.threads - a.threads)
      .slice(0, 8);

    // Pipeline
    const stageMap = new Map<string, number>();
    for (const d of deals) {
      const s = d.stage ?? "unknown";
      stageMap.set(s, (stageMap.get(s) ?? 0) + 1);
    }
    const pipeline = [...stageMap.entries()].map(([stage, count]) => ({ stage, count }));

    const hotLeads = threads.filter((t) => t.priority === "hot").length;
    const interestedLike = threads.filter((t) =>
      ["interested", "meeting_request", "demo_request", "pricing_request"].includes(t.category ?? ""),
    ).length;
    const replyRatePct = threads.length ? Math.round((interestedLike / threads.length) * 100) : 0;
    const dealsWon = deals.filter((d) => (d.stage ?? "").toLowerCase() === "won").length;
    const tasksOpen = tasks.filter((t) => !t.done).length;
    const tasksDone = tasks.filter((t) => t.done === true).length;

    return {
      range: { days, from: from.toISOString(), to: to.toISOString() },
      totals: {
        threads: threads.length,
        hotLeads,
        newContacts: contacts.length,
        dealsCreated: deals.length,
        dealsWon,
        tasksOpen,
        tasksDone,
        replyRatePct,
        avgResponseHours: null,
      },
      daily,
      categoryBreakdown,
      mailboxes,
      pipeline,
    } satisfies WorkspaceAnalytics;
  });
