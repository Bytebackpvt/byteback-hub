import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";

export type EmbeddingRow = {
  id: string;
  thread_id: string | null;
  subject: string | null;
  contact_name: string | null;
  contact_email: string | null;
  company: string | null;
  category: string | null;
  content: string;
  created_at: string;
};

const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBED_MODEL = "google/gemini-embedding-001";

async function embed(text: string): Promise<number[]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
  });
  if (!res.ok) throw new Error(`Embedding failed (${res.status})`);
  const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
  const vec = json.data?.[0]?.embedding;
  if (!vec) throw new Error("Empty embedding response");
  return vec;
}

const ListInput = z.object({
  q: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const listEmbeddings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ListInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getCurrentWorkspaceId(
      context.supabase as unknown as SupabaseClient<Database>,
      context.userId,
    );
    if (!workspaceId) return { rows: [] as EmbeddingRow[], total: 0 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (context.supabase as any)
      .from("email_embeddings")
      .select(
        "id, thread_id, subject, contact_name, contact_email, company, category, content, created_at",
        { count: "exact" },
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.q && data.q.trim().length > 1) {
      const like = `%${data.q.replace(/[%_]/g, " ")}%`;
      q = q.or(`subject.ilike.${like},contact_name.ilike.${like},company.ilike.${like},content.ilike.${like}`);
    }
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: (rows ?? []) as EmbeddingRow[], total: count ?? 0 };
  });

const DeleteInput = z.object({ id: z.string().uuid() });
export const deleteEmbedding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DeleteInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getCurrentWorkspaceId(
      context.supabase as unknown as SupabaseClient<Database>,
      context.userId,
    );
    if (!workspaceId) return { ok: true as const };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("email_embeddings")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return { ok: true as const };
  });

export const deleteAllEmbeddings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getCurrentWorkspaceId(
      context.supabase as unknown as SupabaseClient<Database>,
      context.userId,
    );
    if (!workspaceId) return { deleted: 0 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error, count } = await (context.supabase as any)
      .from("email_embeddings")
      .delete({ count: "exact" })
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return { deleted: count ?? 0 };
  });

const ReembedInput = z.object({ id: z.string().uuid() });
export const reembedRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ReembedInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getCurrentWorkspaceId(
      context.supabase as unknown as SupabaseClient<Database>,
      context.userId,
    );
    if (!workspaceId) return { ok: false as const };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase as any)
      .from("email_embeddings")
      .select("id, subject, content")
      .eq("id", data.id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { ok: false as const };
    const text = `${row.subject ?? ""}\n\n${row.content ?? ""}`.trim();
    const vec = await embed(text);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upErr } = await (context.supabase as any)
      .from("email_embeddings")
      .update({ embedding: vec })
      .eq("id", data.id);
    if (upErr) throw upErr;
    return { ok: true as const };
  });
