import { createFileRoute } from "@tanstack/react-router";
import { runInstantlySync } from "@/lib/sync.functions";

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
        const auth = request.headers.get("authorization") ?? "";
        const expected = `Bearer ${process.env.DIGEST_CRON_SECRET ?? ""}`;
        if (!process.env.DIGEST_CRON_SECRET || auth !== expected) {
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

        const results: Array<{ workspaceId: string; processed: number; embedded: number; error?: string }> = [];
        for (const w of (workspaces ?? []) as Array<{ id: string }>) {
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

        return Response.json({ ok: true, at: new Date().toISOString(), results });
      },
    },
  },
});
