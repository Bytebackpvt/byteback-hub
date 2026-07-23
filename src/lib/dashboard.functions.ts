import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";

export type DashRow = {
  threadId: string;
  subject: string;
  from: string;
  company: string | null;
  mailbox: string | null;
  waited: string;
  at: string;
  temperature: string | null;
  stage: string | null;
};

export type DashTask = {
  id: string;
  title: string;
  due: string | null;
  priority: string;
  linked_to: string;
  thread_id: string | null;
};

export type ActivityRow = {
  id: string;
  kind: "ai" | "manual";
  actor: string;
  title: string;
  detail: string | null;
  threadId: string | null;
  at: string;
};

export type DashboardData = {
  hotLeads: DashRow[];
  followupsDue: DashRow[];
  unreplied: DashRow[];
  tasks: DashTask[];
  activity: ActivityRow[];
  counts: { hot: number; followup: number; unreplied: number; openTasks: number };
};

function waited(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (!isFinite(ms) || ms < 0) return "just now";
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function nameFromEmail(email: string | null | undefined): string {
  if (!email) return "Unknown";
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardData> => {
    const empty: DashboardData = {
      hotLeads: [],
      followupsDue: [],
      unreplied: [],
      tasks: [],
      activity: [],
      counts: { hot: 0, followup: 0, unreplied: 0, openTasks: 0 },
    };
    const wsId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!wsId) return empty;

    const fourHoursAgo = new Date(Date.now() - 4 * 3600 * 1000).toISOString();

    const [threadsRes, tasksRes, aiRes, auditRes] = await Promise.all([
      context.supabase
        .from("email_threads")
        .select(
          "thread_id, subject, contact_email, mailbox, source, temperature, priority, stage, reply_status, last_inbound_at, last_received_at, meta",
        )
        .eq("workspace_id", wsId)
        .order("last_received_at", { ascending: false })
        .limit(500),
      context.supabase
        .from("tasks")
        .select("id, title, due, priority, linked_to, thread_id, done")
        .eq("workspace_id", wsId)
        .eq("done", false)
        .order("due", { ascending: true, nullsFirst: false })
        .limit(20),
      context.supabase
        .from("ai_events")
        .select("id, event_type, title, detail, thread_id, created_at")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false })
        .limit(15),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (context.supabase as any)
        .from("lead_audit_log")
        .select("id, change_type, old_value, new_value, actor_email, lead_key, created_at")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

    const threads = threadsRes.data ?? [];
    const toRow = (t: (typeof threads)[number]): DashRow => {
      const meta = (t.meta ?? {}) as Record<string, unknown>;
      return {
        threadId: t.thread_id,
        subject: t.subject ?? "(no subject)",
        from: nameFromEmail(t.contact_email),
        company: (meta.company as string | null) ?? null,
        mailbox: t.mailbox,
        waited: waited(t.last_received_at),
        at: t.last_received_at ?? t.last_inbound_at ?? "",
        temperature: t.temperature ?? t.priority ?? null,
        stage: t.stage ?? null,
      };
    };

    const hot = threads.filter(
      (t) => (t.temperature === "hot" || t.priority === "hot") && t.reply_status !== "closed",
    );
    const followups = threads.filter(
      (t) => t.reply_status === "waiting_reply" || t.reply_status === "customer_replied_again",
    );
    const unreplied = threads.filter(
      (t) =>
        (t.reply_status === "waiting_reply" || t.reply_status === "customer_replied_again") &&
        t.last_inbound_at &&
        t.last_inbound_at < fourHoursAgo,
    );

    const tasks = (tasksRes.data ?? []) as DashTask[];

    const aiActivity: ActivityRow[] = (aiRes.data ?? []).map((e) => ({
      id: `ai-${e.id}`,
      kind: "ai" as const,
      actor: "AI",
      title: e.title,
      detail: e.detail,
      threadId: e.thread_id,
      at: e.created_at,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const manualActivity: ActivityRow[] = ((auditRes.data as any[]) ?? []).map((r) => ({
      id: `au-${r.id}`,
      kind: "manual" as const,
      actor: r.actor_email ?? "Team",
      title: `${r.change_type === "stage" ? "Stage" : "Temperature"} → ${r.new_value ?? "—"}`,
      detail: `${r.lead_key} (was ${r.old_value ?? "—"})`,
      threadId: null,
      at: r.created_at,
    }));

    const activity = [...aiActivity, ...manualActivity]
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 20);

    return {
      hotLeads: hot.slice(0, 8).map(toRow),
      followupsDue: followups.slice(0, 8).map(toRow),
      unreplied: unreplied.slice(0, 8).map(toRow),
      tasks,
      activity,
      counts: {
        hot: hot.length,
        followup: followups.length,
        unreplied: unreplied.length,
        openTasks: tasks.length,
      },
    };
  });
