import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";

export type SearchHitType = "task" | "notification" | "memory";

export type SearchHit = {
  id: string;
  type: SearchHitType;
  title: string;
  snippet: string;
  link: string;
  meta?: string;
  score: number;
  reason: string;
};

export type SearchFilters = {
  types?: SearchHitType[];
  since?: string | null; // ISO cutoff
  priority?: Partial<Record<SearchHitType, number>>; // weight multipliers (default 1)
};

const FiltersSchema = z
  .object({
    types: z.array(z.enum(["task", "notification", "memory"])).optional(),
    since: z.string().nullish(),
    priority: z.record(z.string(), z.number()).optional(),
  })
  .default({});

const Input = z.object({
  q: z.string().min(1).max(200),
  semantic: z.boolean().default(true),
  filters: FiltersSchema.optional(),
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

function highlight(text: string, q: string): string {
  const lc = text.toLowerCase();
  const idx = lc.indexOf(q.toLowerCase());
  if (idx < 0) return text.slice(0, 140);
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + q.length + 60);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

/** Core search — reusable across the search page and saved-search alerts. */
export async function runUniversalSearch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  workspaceId: string,
  q: string,
  filters: SearchFilters = {},
  semantic = true,
): Promise<SearchHit[]> {
  const like = `%${q.replace(/[%_]/g, " ")}%`;
  const wantTypes = new Set<SearchHitType>(
    filters.types && filters.types.length ? filters.types : ["task", "notification", "memory"],
  );
  const priority = { task: 1, notification: 1, memory: 1, ...(filters.priority ?? {}) };
  const since = filters.since ?? null;

  const hits: SearchHit[] = [];

  if (wantTypes.has("task")) {
    let tq = supabase
      .from("tasks")
      .select("id, title, due, priority, done, created_at")
      .eq("workspace_id", workspaceId)
      .ilike("title", like)
      .limit(15);
    if (since) tq = tq.gte("created_at", since);
    const { data } = await tq;
    for (const t of (data ?? []) as Array<{
      id: string; title: string; due: string | null; priority: string; done: boolean; created_at: string;
    }>) {
      hits.push({
        id: t.id,
        type: "task",
        title: t.title,
        snippet: `${t.priority} priority${t.done ? " · done" : t.due ? ` · due ${new Date(t.due).toLocaleDateString()}` : ""}`,
        link: "/app/tasks",
        meta: "Task",
        score: 0.4 * (priority.task ?? 1),
        reason: `Task title contains "${q}"`,
      });
    }
  }

  if (wantTypes.has("notification")) {
    let nq = supabase
      .from("notifications")
      .select("id, title, body, link, kind, created_at")
      .eq("workspace_id", workspaceId)
      .or(`title.ilike.${like},body.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(15);
    if (since) nq = nq.gte("created_at", since);
    const { data } = await nq;
    for (const n of (data ?? []) as Array<{
      id: string; title: string; body: string | null; link: string | null; kind: string; created_at: string;
    }>) {
      const inTitle = n.title.toLowerCase().includes(q.toLowerCase());
      hits.push({
        id: n.id,
        type: "notification",
        title: n.title,
        snippet: n.body ? highlight(n.body, q) : "",
        link: n.link ?? "/app/notifications",
        meta: n.kind.replace(/_/g, " "),
        score: (inTitle ? 0.5 : 0.35) * (priority.notification ?? 1),
        reason: inTitle ? `Notification title contains "${q}"` : `Notification body contains "${q}"`,
      });
    }
  }

  if (wantTypes.has("memory") && semantic && q.length >= 3) {
    const { count } = await supabase
      .from("email_embeddings")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    if (count && count > 0) {
      const vec = await embedQuery(q);
      if (vec) {
        const { data: rows } = await supabase.rpc("match_email_embeddings", {
          _workspace_id: workspaceId,
          _query: vec,
          _limit: 8,
        });
        for (const r of (rows ?? []) as Array<{
          id: string; subject: string | null; contact_name: string | null; company: string | null;
          content: string; similarity: number; thread_id: string | null; created_at: string;
        }>) {
          if (since && new Date(r.created_at).getTime() < new Date(since).getTime()) continue;
          hits.push({
            id: r.id,
            type: "memory",
            title: r.subject ?? "(no subject)",
            snippet: `${r.contact_name ?? "Someone"}${r.company ? ` @ ${r.company}` : ""} — ${r.content.slice(0, 140)}`,
            link: "/app/inbox",
            meta: `AI memory · ${(r.similarity * 100).toFixed(0)}% match`,
            score: r.similarity * (priority.memory ?? 1),
            reason: `Semantic similarity ${(r.similarity * 100).toFixed(0)}% to "${q}"`,
          });
        }
      }
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits;
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
    const hits = await runUniversalSearch(
      context.supabase,
      workspaceId,
      data.q,
      data.filters ?? {},
      data.semantic,
    );
    return { hits };
  });
