import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";

const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBED_MODEL = "google/gemini-embedding-001";

async function embed(text: string): Promise<number[]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("Embedding rate limit reached. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings.");
    throw new Error(`Embedding failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
  const vec = json.data?.[0]?.embedding;
  if (!vec) throw new Error("Empty embedding response");
  return vec;
}

const EmailInput = z.object({
  threadId: z.string().min(1),
  subject: z.string().default(""),
  content: z.string().min(1),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  company: z.string().optional(),
  category: z.string().optional(),
});

export const embedAndStoreEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => EmailInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getCurrentWorkspaceId(
      context.supabase as unknown as SupabaseClient<Database>,
      context.userId,
    );
    if (!workspaceId) return { ok: false, reason: "no-workspace" as const };

    const text = `${data.subject}\n\n${data.content}`.trim();
    const vec = await embed(text);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("email_embeddings")
      .upsert(
        {
          workspace_id: workspaceId,
          thread_id: data.threadId,
          subject: data.subject,
          content: data.content.slice(0, 6000),
          contact_name: data.contactName ?? null,
          contact_email: data.contactEmail ?? null,
          company: data.company ?? null,
          category: data.category ?? null,
          embedding: vec,
          metadata: {},
        },
        { onConflict: "workspace_id,thread_id" },
      );
    if (error) throw error;
    return { ok: true as const };
  });

export type MemoryHit = {
  id: string;
  thread_id: string | null;
  subject: string | null;
  contact_name: string | null;
  contact_email: string | null;
  company: string | null;
  content: string;
  category: string | null;
  similarity: number;
  created_at: string;
};

const SearchInput = z.object({
  query: z.string().min(2).max(500),
  limit: z.number().int().min(1).max(20).default(6),
});

export const searchMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SearchInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getCurrentWorkspaceId(
      context.supabase as unknown as SupabaseClient<Database>,
      context.userId,
    );
    if (!workspaceId) return { hits: [] as MemoryHit[] };

    // Cheap short-circuit: no rows means no need to embed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (context.supabase as any)
      .from("email_embeddings")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    if (!count || count === 0) return { hits: [] as MemoryHit[] };

    const vec = await embed(data.query);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (context.supabase as any).rpc("match_email_embeddings", {
      _workspace_id: workspaceId,
      _query: vec,
      _limit: data.limit,
    });
    if (error) throw error;
    return { hits: (rows ?? []) as MemoryHit[] };
  });
