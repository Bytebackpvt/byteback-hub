import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCurrentWorkspaceId } from "@/lib/workspace.server";

/**
 * Fire-and-forget sync for the caller's current workspace. Runs Gmail sync
 * for every oauth_connection in the workspace and (if enabled) an Instantly
 * recent sync. Skips if a sync ran successfully within the last 3 minutes.
 * Invoked on sign-in / app load so invited teammates see data immediately
 * instead of waiting for the 5-minute cron.
 */
export const triggerWorkspaceSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { ok: false, reason: "no-workspace" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    // Throttle: skip if we synced this workspace in the last 3 min.
    const { data: recent } = await admin
      .from("sync_state")
      .select("source, last_ok_at")
      .eq("workspace_id", workspaceId)
      .order("last_ok_at", { ascending: false })
      .limit(1);
    const lastOk = recent?.[0]?.last_ok_at ? new Date(recent[0].last_ok_at).getTime() : 0;
    if (Date.now() - lastOk < 3 * 60 * 1000) {
      return { ok: true, skipped: true as const };
    }

    // Run in background so the client doesn't wait on multi-minute backfills.
    void (async () => {
      try {
        const { data: conns } = await admin
          .from("oauth_connections")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("provider", "gmail")
          .in("status", ["active", "error"]);
        if (conns && conns.length) {
          const { syncGmailConnection } = await import("@/lib/gmail-sync.server");
          for (const c of conns as Array<{ id: string }>) {
            try { await syncGmailConnection(c.id); } catch { /* noop */ }
          }
        }

        const { data: inst } = await admin
          .from("workspace_integrations")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("provider", "instantly")
          .eq("status", "connected")
          .maybeSingle();
        if (inst) {
          try {
            const { runInstantlySync } = await import("@/lib/sync.functions");
            await runInstantlySync(workspaceId, { limit: 300, mode: "recent" });
          } catch { /* noop */ }
        }
      } catch (e) {
        console.error("[triggerWorkspaceSync] background sync failed", e);
      }
    })();

    return { ok: true, started: true as const };
  });
