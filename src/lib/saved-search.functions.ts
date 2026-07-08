import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";
import {
  runUniversalSearch,
  type SearchFilters,
  type SearchHit,
} from "@/lib/search.functions";

export type SavedSearch = {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  alert_enabled: boolean;
  last_checked_at: string | null;
  last_seen_ids: string[];
  created_at: string;
  updated_at: string;
};

const FiltersSchema = z
  .object({
    types: z.array(z.enum(["task", "notification", "memory"])).optional(),
    since: z.string().nullish(),
    priority: z.record(z.string(), z.number()).optional(),
  })
  .default({});

const CreateInput = z.object({
  name: z.string().min(1).max(80),
  query: z.string().min(1).max(200),
  filters: FiltersSchema,
  alert_enabled: z.boolean().default(false),
});

export const listSavedSearches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getCurrentWorkspaceId(
      context.supabase as unknown as SupabaseClient<Database>,
      context.userId,
    );
    if (!workspaceId) return { searches: [] as SavedSearch[] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any)
      .from("saved_searches")
      .select("id, name, query, filters, alert_enabled, last_checked_at, last_seen_ids, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { searches: (data ?? []) as SavedSearch[] };
  });

export const createSavedSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => CreateInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getCurrentWorkspaceId(
      context.supabase as unknown as SupabaseClient<Database>,
      context.userId,
    );
    if (!workspaceId) throw new Error("No workspace");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error } = await (context.supabase as any)
      .from("saved_searches")
      .insert({
        workspace_id: workspaceId,
        user_id: context.userId,
        name: data.name,
        query: data.query,
        filters: data.filters,
        alert_enabled: data.alert_enabled,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: inserted.id as string };
  });

const ToggleInput = z.object({ id: z.string().uuid(), alert_enabled: z.boolean() });
export const toggleSavedSearchAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ToggleInput.parse(raw))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("saved_searches")
      .update({ alert_enabled: data.alert_enabled })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

const DeleteInput = z.object({ id: z.string().uuid() });
export const deleteSavedSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DeleteInput.parse(raw))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("saved_searches")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

const RunInput = z.object({ id: z.string().uuid() });
/** Run a saved search and record newly-seen results as notifications. */
export const runSavedSearchAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => RunInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getCurrentWorkspaceId(
      context.supabase as unknown as SupabaseClient<Database>,
      context.userId,
    );
    if (!workspaceId) return { newCount: 0 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase as any)
      .from("saved_searches")
      .select("id, name, query, filters, last_seen_ids")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { newCount: 0 };

    const filters = (row.filters ?? {}) as SearchFilters;
    const hits: SearchHit[] = await runUniversalSearch(
      context.supabase,
      workspaceId,
      row.query as string,
      filters,
      true,
    );
    const seen = new Set<string>((row.last_seen_ids ?? []) as string[]);
    const currentIds = hits.map((h) => `${h.type}:${h.id}`);
    const newHits = hits.filter((h) => !seen.has(`${h.type}:${h.id}`));

    if (newHits.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (context.supabase as any).from("notifications").insert(
        newHits.slice(0, 5).map((h) => ({
          workspace_id: workspaceId,
          user_id: context.userId,
          kind: "info",
          title: `🔔 "${row.name}" matched`,
          body: `${h.title} — ${h.reason}`,
          link: h.link,
          meta: { savedSearchId: row.id, matchType: h.type },
        })),
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (context.supabase as any)
      .from("saved_searches")
      .update({
        last_checked_at: new Date().toISOString(),
        last_seen_ids: currentIds.slice(0, 200),
      })
      .eq("id", row.id);

    return { newCount: newHits.length };
  });
