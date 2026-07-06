import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type NotificationKind =
  | "hot_lead"
  | "new_reply"
  | "lost_lead"
  | "followup"
  | "info";

export type NotificationRow = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  thread_key: string | null;
  read_at: string | null;
  created_at: string;
  meta: Record<string, string | number | boolean | null>;
};

async function getOwnedWorkspaceId(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data?.id) return data.id as string;
  const { data: created, error: createErr } = await supabase
    .from("workspaces")
    .insert({ owner_id: userId, name: "My Workspace", slug: `ws-${userId.slice(0, 8)}-${Date.now().toString(36)}` })
    .select("id")
    .single();
  if (createErr) throw createErr;
  return created.id as string;
}

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { notifications: [] as NotificationRow[], unread: 0 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any)
      .from("notifications")
      .select("id, kind, title, body, link, thread_key, read_at, created_at, meta")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    const rows = (data ?? []) as NotificationRow[];
    return {
      notifications: rows,
      unread: rows.filter((r) => !r.read_at).length,
    };
  });

const MarkReadInput = z.object({ id: z.string().uuid().optional() });
export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => MarkReadInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { ok: true as const };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = (context.supabase as any)
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .is("read_at", null);
    if (data.id) q.eq("id", data.id);
    const { error } = await q;
    if (error) throw error;
    return { ok: true as const };
  });

// ------- Smart notification scanner -------
// Given the current inbox thread list, create/update workspace notifications
// idempotently (unique index on workspace_id+kind+thread_key).
const ScanInput = z.object({
  threads: z
    .array(
      z.object({
        id: z.string(),
        fromName: z.string(),
        company: z.string(),
        subject: z.string(),
        category: z.string(),
        priority: z.string(),
        unread: z.boolean().default(false),
      }),
    )
    .max(200),
});

export const scanForNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ScanInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getOwnedWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { created: 0 };

    type NewNotif = {
      workspace_id: string;
      user_id: string;
      kind: NotificationKind;
      title: string;
      body: string;
      link: string;
      thread_key: string;
      meta: Record<string, string | number | boolean | null>;
    };
    const rows: NewNotif[] = [];
    for (const t of data.threads) {
      const base = {
        workspace_id: workspaceId,
        user_id: context.userId,
        link: "/app/inbox",
        thread_key: t.id,
        meta: { category: t.category, priority: t.priority },
      };
      if (t.priority === "hot") {
        rows.push({
          ...base,
          kind: "hot_lead",
          title: `🔥 Hot lead: ${t.fromName} @ ${t.company}`,
          body: t.subject,
        });
      } else if (t.unread) {
        rows.push({
          ...base,
          kind: "new_reply",
          title: `New reply from ${t.fromName}`,
          body: t.subject,
        });
      }
      if (t.category === "not-interested") {
        rows.push({
          ...base,
          kind: "lost_lead",
          title: `Lost lead: ${t.fromName} @ ${t.company}`,
          body: `Marked not interested`,
        });
      }
    }
    if (rows.length === 0) return { created: 0 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error } = await (context.supabase as any)
      .from("notifications")
      .upsert(rows, {
        onConflict: "workspace_id,kind,thread_key",
        ignoreDuplicates: true,
      })
      .select("id, kind, title, body, link");
    if (error) throw error;

    // Email delivery for high-signal alerts via Resend gateway.
    const alertKinds = new Set<NotificationKind>(["hot_lead", "lost_lead", "followup"]);
    const toEmail = (await context.supabase.auth.getUser()).data.user?.email;
    const apiKey = process.env.RESEND_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (toEmail && apiKey && lovableKey && inserted?.length) {
      const alerts = (inserted as Array<{ kind: NotificationKind; title: string; body: string; link: string | null }>)
        .filter((r) => alertKinds.has(r.kind));
      await Promise.all(
        alerts.map((r) =>
          fetch("https://connector-gateway.lovable.dev/resend/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableKey}`,
              "X-Connection-Api-Key": apiKey,
            },
            body: JSON.stringify({
              from: "ByteBack Inbox <onboarding@resend.dev>",
              to: [toEmail],
              subject: r.title,
              html: `<div style="font-family:system-ui,sans-serif;max-width:520px;padding:24px"><h2 style="margin:0 0 8px 0;font-size:18px">${escapeHtml(r.title)}</h2><p style="margin:0 0 16px 0;color:#475569">${escapeHtml(r.body)}</p><a href="${r.link ?? "/app/inbox"}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Open inbox</a></div>`,
            }),
          }).catch(() => {}),
        ),
      );
    }
    return { created: inserted?.length ?? 0 };
  });

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
