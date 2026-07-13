import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCurrentWorkspaceId } from "@/lib/workspace.server";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export { getCurrentWorkspaceId };

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

export const ensureCurrentWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    return { workspaceId: workspaceId ?? null };
  });
