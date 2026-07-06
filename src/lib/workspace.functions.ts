import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

/** Returns the primary workspace id for a user (first membership, oldest first). */
export async function getCurrentWorkspaceId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | undefined> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.workspace_id as string | undefined;
}

export const getCurrentWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) return { workspace: null, role: null as WorkspaceRole | null };
    const [{ data: ws }, { data: mem }] = await Promise.all([
      context.supabase
        .from("workspaces")
        .select("id, name, slug, business_type, owner_id, created_at")
        .eq("id", workspaceId)
        .maybeSingle(),
      context.supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);
    return {
      workspace: ws,
      role: (mem?.role ?? null) as WorkspaceRole | null,
    };
  });
