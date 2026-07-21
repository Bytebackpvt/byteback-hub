import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";

export type RadarBucketKey =
  | "hot_unreplied"
  | "warm"
  | "demo_requests"
  | "pricing_requests"
  | "pickup"
  | "meetings_to_schedule"
  | "followups_overdue"
  | "lost";

export type RadarItem = {
  id: string;
  title: string;
  subtitle: string;
  waited: string;
  link: string | null;
  value: number; // estimated ₹ (INR)
  bucket: RadarBucketKey;
  thread_key?: string | null;
};

export type RadarBucket = {
  key: RadarBucketKey;
  label: string;
  icon: string;
  tone: "hot" | "warm" | "cool" | "neutral";
  items: RadarItem[];
  totalValue: number;
};

export type RadarSummary = {
  headline: string;
  totalPotential: number;
  hotUnreplied: number;
  buckets: RadarBucket[];
  generatedAt: string;
};

// Simple, explainable value model (INR). Product can tune later.
const VALUE_BY_BUCKET: Record<RadarBucketKey, number> = {
  hot_unreplied: 500000,
  demo_requests: 750000,
  pricing_requests: 600000,
  meetings_to_schedule: 400000,
  warm: 200000,
  pickup: 150000,
  followups_overdue: 100000,
  lost: 0,
};

const LABELS: Record<RadarBucketKey, { label: string; icon: string; tone: RadarBucket["tone"] }> = {
  hot_unreplied: { label: "Hot leads unreplied", icon: "flame", tone: "hot" },
  demo_requests: { label: "Demo requests", icon: "video", tone: "hot" },
  pricing_requests: { label: "Pricing requests", icon: "wallet", tone: "hot" },
  meetings_to_schedule: { label: "Meetings to schedule", icon: "calendar", tone: "warm" },
  warm: { label: "Warm leads", icon: "sun", tone: "warm" },
  pickup: { label: "Pickup requests", icon: "package", tone: "cool" },
  followups_overdue: { label: "Follow-ups overdue", icon: "alarm", tone: "warm" },
  lost: { label: "Lost opportunities", icon: "x", tone: "neutral" },
};

function inrCompact(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.00$/, "")} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1).replace(/\.0$/, "")} L`;
  if (n >= 1000) return `₹${Math.round(n / 1000)}K`;
  return `₹${n}`;
}

function waitedFrom(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!isFinite(ms) || ms < 0) return "just now";
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  thread_key: string | null;
  read_at: string | null;
  created_at: string;
  meta: Record<string, unknown> | null;
};

type TaskRow = {
  id: string;
  title: string;
  due: string | null;
  priority: string;
  done: boolean;
  linked_to: string;
  created_at: string;
};

function categoryFromMeta(meta: Record<string, unknown> | null): string | null {
  if (!meta) return null;
  const v = meta.category ?? meta.classification;
  return typeof v === "string" ? v : null;
}

function bucketFor(kind: string, meta: Record<string, unknown> | null): RadarBucketKey | null {
  const cat = categoryFromMeta(meta) ?? "";
  const c = cat.toLowerCase();
  if (kind === "lost_lead") return "lost";
  if (c.includes("meeting")) return "meetings_to_schedule";
  if (c.includes("demo")) return "demo_requests";
  if (c.includes("pricing") || c.includes("quote") || c.includes("budget")) return "pricing_requests";
  if (c.includes("pickup") || c.includes("delivery")) return "pickup";
  if (kind === "hot_lead") return "hot_unreplied";
  if (kind === "new_reply") return "warm";
  if (kind === "followup") return "followups_overdue";
  return null;
}

async function getWorkspaceId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const ws = await getCurrentWorkspaceId(supabase, userId);
  return ws ?? null;
}

const RadarInput = z
  .object({
    sinceHours: z.number().int().min(1).max(24 * 30).optional(),
    buckets: z.array(z.string()).optional(),
  })
  .optional();

export const getRadarSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => RadarInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getWorkspaceId(
      context.supabase as unknown as SupabaseClient<Database>,
      context.userId,
    );
    const empty: RadarSummary = {
      headline: "Nothing urgent. Radar is quiet.",
      totalPotential: 0,
      hotUnreplied: 0,
      buckets: [],
      generatedAt: new Date().toISOString(),
    };
    if (!workspaceId) return { summary: empty };

    const nowIso = new Date().toISOString();
    const sinceIso = data?.sinceHours
      ? new Date(Date.now() - data.sinceHours * 3600 * 1000).toISOString()
      : null;
    const bucketFilter = data?.buckets && data.buckets.length ? new Set(data.buckets) : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let notifQ = (context.supabase as any)
      .from("notifications")
      .select("id, kind, title, body, link, thread_key, read_at, created_at, meta")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(200);
    if (sinceIso) notifQ = notifQ.gte("created_at", sinceIso);
    const [notifRes, taskRes] = await Promise.all([
      notifQ,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (context.supabase as any)
        .from("tasks")
        .select("id, title, due, priority, done, linked_to, created_at")
        .eq("workspace_id", workspaceId)
        .eq("done", false)
        .order("due", { ascending: true, nullsFirst: false })
        .limit(200),
    ]);

    const notifications = ((notifRes.data ?? []) as NotificationRow[]).filter(
      (n) => n.read_at === null,
    );
    const tasks = (taskRes.data ?? []) as TaskRow[];

    // Group notifications into buckets
    const grouped = new Map<RadarBucketKey, RadarItem[]>();
    for (const n of notifications) {
      const bucket = bucketFor(n.kind, n.meta);
      if (!bucket) continue;
      const item: RadarItem = {
        id: n.id,
        title: n.title,
        subtitle: n.body ?? "",
        waited: waitedFrom(n.created_at),
        link: n.link,
        value: VALUE_BY_BUCKET[bucket],
        bucket,
        thread_key: n.thread_key,
      };
      const arr = grouped.get(bucket) ?? [];
      arr.push(item);
      grouped.set(bucket, arr);
    }

    // Overdue tasks → followups_overdue
    const overdueTasks: RadarItem[] = tasks
      .filter((t) => t.due && new Date(t.due).getTime() < Date.now())
      .slice(0, 20)
      .map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: `Overdue since ${new Date(t.due as string).toLocaleDateString()}`,
        waited: waitedFrom(t.due as string),
        link: "/app/tasks",
        value: VALUE_BY_BUCKET.followups_overdue,
        bucket: "followups_overdue",
      }));
    if (overdueTasks.length) {
      const arr = grouped.get("followups_overdue") ?? [];
      arr.push(...overdueTasks);
      grouped.set("followups_overdue", arr);
    }

    const order: RadarBucketKey[] = [
      "hot_unreplied",
      "demo_requests",
      "pricing_requests",
      "meetings_to_schedule",
      "warm",
      "pickup",
      "followups_overdue",
      "lost",
    ];

    const buckets: RadarBucket[] = order
      .map((key) => {
        const items = (grouped.get(key) ?? []).slice(0, 20);
        const meta = LABELS[key];
        return {
          key,
          label: meta.label,
          icon: meta.icon,
          tone: meta.tone,
          items,
          totalValue: items.reduce((s, i) => s + i.value, 0),
        };
      })
      .filter((b) => b.items.length > 0)
      .filter((b) => !bucketFilter || bucketFilter.has(b.key));

    const hotUnreplied = grouped.get("hot_unreplied")?.length ?? 0;
    const totalPotential = buckets.reduce((s, b) => s + b.totalValue, 0);

    // Headline — plain counts, no fabricated ₹ potential.
    let headline: string;
    if (hotUnreplied > 0) {
      headline = `You have ${hotUnreplied} hot ${hotUnreplied === 1 ? "lead" : "leads"} waiting for a reply.`;
    } else if (buckets.length > 0) {
      const top = buckets[0];
      const parts = buckets
        .slice(0, 3)
        .map((b) => `${b.items.length} ${b.label.toLowerCase()}`);
      headline = `${top.items.length} ${top.label.toLowerCase()} pending · ${parts.join(" · ")}`;
    } else {
      headline = "Nothing urgent right now. Radar is quiet.";
    }

    // Best-effort cache write; ignore errors so radar still renders.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (context.supabase as any)
      .from("ai_insights_cache")
      .upsert(
        { workspace_id: workspaceId, kind: "radar", payload: summary as unknown as object },
        { onConflict: "workspace_id,kind" },
      );

    return { summary };
  });
