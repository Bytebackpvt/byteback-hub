import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";

export type SearchHit = {
  id: string;
  type: "task" | "notification" | "memory";
  title: string;
  snippet: string;
  link: string;
  meta?: string;
  score?: number;
};

const Input = z.object({
  q: z.string().min(1).max(200),
  semantic: z.boolean().default(true),
});

const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBED_MODEL = "google/gemini-embedding-001";

async function embedQuery(text: string): Promise<number[] | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(EMBED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 500) }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    return json.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

export const universalSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getCurrentWorkspaceId(
      context.supabase as unknown as SupabaseClient<Database>,
      context.userId,
    );
    if (!workspaceId) return { hits: [] as SearchHit[] };

    const like = `%${data.q.replace(/[%_]/g, " ")}%`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [tasksRes, notifRes] = await Promise.all([
      (context.supabase as any)
        .from("tasks")
        .select("id, title, due, priority, done")
        .eq("workspace_id", workspaceId)
        .ilike("title", like)
        .limit(10),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (context.supabase as any)
        .from("notifications")
        .select("id, title, body, link, kind, created_at")
        .eq("workspace_id", workspaceId)
        .or(`title.ilike.${like},body.ilike.${like}`)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const hits: SearchHit[] = [];
    for (const t of (tasksRes.data ?? []) as Array<{
      id: string;
      title: string;
      due: string | null;
      priority: string;
      done: boolean;
    }>) {
      hits.push({
        id: t.id,
        type: "task",
        title: t.title,
        snippet: `${t.priority} priority${t.done ? " · done" : t.due ? ` · due ${new Date(t.due).toLocaleDateString()}` : ""}`,
        link: "/app/tasks",
        meta: "Task",
      });
    }
    for (const n of (notifRes.data ?? []) as Array<{
      id: string;
      title: string;
      body: string | null;
      link: string | null;
      kind: string;
    }>) {
      hits.push({
        id: n.id,
        type: "notification",
        title: n.title,
        snippet: n.body ?? "",
        link: n.link ?? "/app/notifications",
        meta: n.kind.replace(/_/g, " "),
      });
    }

    // Semantic layer over stored email memory (only if data.semantic and something exists)
    if (data.semantic && data.q.length >= 3) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (context.supabase as any)
        .from("email_embeddings")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);
      if (count && count > 0) {
        const vec = await embedQuery(data.q);
        if (vec) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: rows } = await (context.supabase as any).rpc("match_email_embeddings", {
            _workspace_id: workspaceId,
            _query: vec,
            _limit: 6,
          });
          for (const r of (rows ?? []) as Array<{
            id: string;
            subject: string | null;
            contact_name: string | null;
            company: string | null;
            content: string;
            similarity: number;
            thread_id: string | null;
          }>) {
            hits.push({
              id: r.id,
              type: "memory",
              title: r.subject ?? "(no subject)",
              snippet: `${r.contact_name ?? "Someone"}${r.company ? ` @ ${r.company}` : ""} — ${r.content.slice(0, 140)}`,
              link: "/app/inbox",
              meta: `AI memory · ${(r.similarity * 100).toFixed(0)}% match`,
              score: r.similarity,
            });
          }
        }
      }
    }

    return { hits };
  });
