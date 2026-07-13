import { createFileRoute } from "@tanstack/react-router";
import { runInstantlySync } from "@/lib/sync.functions";
import { syncAllGmail } from "@/lib/gmail.functions";

/**
 * Public cron endpoint — runs the AI Sync Engine for every workspace that
 * has at least one active member. Fetches recent Instantly replies,
 * classifies them, upserts contacts / threads / deals / timeline / scores,
 * and generates embeddings for semantic memory.
 *
 * Schedule via pg_cron:
 *   POST /api/public/cron/sync
 *   Authorization: Bearer <DIGEST_CRON_SECRET>
 * Recommended cadence: every 5–10 minutes.
 */
export const Route = createFileRoute("/api/public/cron/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Accept either the shared cron secret (Bearer) or the project's
        // publishable/anon key (apikey header — the pg_cron standard pattern).
        const auth = request.headers.get("authorization") ?? "";
        const apiKey = request.headers.get("apikey") ?? "";
        const cronSecret = process.env.DIGEST_CRON_SECRET ?? "";
        const publishable =
          process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
        const bearerOk = cronSecret && auth === `Bearer ${cronSecret}`;
        const apiKeyOk = publishable && apiKey === publishable;
        if (!bearerOk && !apiKeyOk) {
          return new Response("unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const admin = supabaseAdmin as any;

        const { data: workspaces, error } = await admin
          .from("workspaces")
          .select("id")
          .order("created_at", { ascending: true })
          .limit(50);
        if (error) {
          console.error("[cron.sync] list workspaces failed", error);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        // Only sync Instantly for workspaces that have explicitly connected it
        // via workspace_integrations (provider='instantly', status='connected').
        // Otherwise a shared global INSTANTLY_API_KEY would leak the same
        // Instantly mailbox data into every workspace.
        const { data: enabled } = await admin
          .from("workspace_integrations")
          .select("workspace_id")
          .eq("provider", "instantly")
          .eq("status", "connected");
        const enabledSet = new Set<string>(
          ((enabled ?? []) as Array<{ workspace_id: string }>).map((r) => r.workspace_id),
        );

        const results: Array<{ workspaceId: string; processed: number; embedded: number; error?: string; skipped?: boolean }> = [];
        for (const w of (workspaces ?? []) as Array<{ id: string }>) {
          if (!enabledSet.has(w.id)) {
            results.push({ workspaceId: w.id, processed: 0, embedded: 0, skipped: true });
            continue;
          }
          try {
            const r = await runInstantlySync(w.id, { limit: 50 });
            results.push({
              workspaceId: w.id,
              processed: r.processed,
              embedded: r.embedded,
              error: r.error,
            });
          } catch (err) {
            results.push({
              workspaceId: w.id,
              processed: 0,
              embedded: 0,
              error: err instanceof Error ? err.message : "sync failed",
            });
          }
        }

        let gmail: { connections: number; processed: number } | { error: string } = { connections: 0, processed: 0 };
        try {
          gmail = await syncAllGmail();
        } catch (e) {
          gmail = { error: e instanceof Error ? e.message : "gmail sync failed" };
        }

        return Response.json({ ok: true, at: new Date().toISOString(), results, gmail });
      },
    },
  },
});
