import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

/** Returns the primary workspace id for a user (first membership, oldest first).
 * Falls back to any workspace the user owns, self-healing the missing
 * workspace_members row so subsequent RLS-scoped queries work. As a last
 * resort, creates a personal workspace so the user is never stuck. */
export async function getCurrentWorkspaceId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | undefined> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) throw error;
  const memberships = data ?? [];
  if (memberships.length === 1 && memberships[0]?.workspace_id) {
    return memberships[0].workspace_id as string;
  }

  if (memberships.length > 1) {
    const workspaceIds = memberships.map((m) => m.workspace_id as string).filter(Boolean);

    // Prefer the workspace that already has real mailbox data or connections.
    // This self-heals duplicate workspaces created during early onboarding bugs.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const [{ data: threadRows }, { data: oauthRows }, { data: taskRows }] = await Promise.all([
      sb.from("email_threads").select("workspace_id").in("workspace_id", workspaceIds).limit(1),
      sb.from("oauth_connections").select("workspace_id").in("workspace_id", workspaceIds).limit(1),
      sb.from("tasks").select("workspace_id").in("workspace_id", workspaceIds).limit(1),
    ]);
    const activeWorkspaceId =
      threadRows?.[0]?.workspace_id ?? oauthRows?.[0]?.workspace_id ?? taskRows?.[0]?.workspace_id;
    if (activeWorkspaceId) return activeWorkspaceId as string;

    return memberships[0].workspace_id as string;
  }

  // Fallback: use admin client to heal missing membership / auto-provision.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;

  const { data: owned } = await admin
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let workspaceId = owned?.id as string | undefined;

  if (!workspaceId) {
    const { data: prof } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();
    let email = prof?.email as string | undefined;
    let fullName = prof?.full_name as string | undefined;
    if (!email) {
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      email = authUser?.user?.email ?? undefined;
      fullName = (authUser?.user?.user_metadata?.full_name as string | undefined) ?? undefined;
      await admin
        .from("profiles")
        .upsert(
          {
            id: userId,
            email: email ?? null,
            full_name: fullName ?? null,
            onboarded: false,
          },
          { onConflict: "id" },
        );
    }
    const name =
      fullName ||
      email?.split("@")[0] ||
      "My Workspace";
    const slug = `ws-${userId.slice(0, 8)}-${Date.now().toString(36)}`;
    const { data: ws, error: wsErr } = await admin
      .from("workspaces")
      .insert({ owner_id: userId, name, slug })
      .select("id")
      .single();
    if (wsErr) throw wsErr;
    workspaceId = ws.id as string;
  }

  await admin
    .from("workspace_members")
    .upsert(
      { workspace_id: workspaceId, user_id: userId, role: "owner" },
      { onConflict: "workspace_id,user_id" },
    );

  return workspaceId;
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

export const ensureCurrentWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    return { workspaceId: workspaceId ?? null };
  });
