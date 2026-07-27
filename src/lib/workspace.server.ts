import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Returns the primary workspace id for a user. If none exists, creates one. */
export async function getCurrentWorkspaceId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | undefined> {
  // Step 0: auto-claim any pending invites for this user's email. This makes
  // newly-signed-up teammates land inside the workspace they were invited to,
  // instead of a fresh empty solo workspace.
  await claimPendingInvites(userId);

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, created_at")
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const [{ data: threadRows }, { data: oauthRows }, { data: taskRows }] = await Promise.all([
      sb.from("email_threads").select("workspace_id").in("workspace_id", workspaceIds).limit(50),
      sb.from("oauth_connections").select("workspace_id").in("workspace_id", workspaceIds).limit(50),
      sb.from("tasks").select("workspace_id").in("workspace_id", workspaceIds).limit(50),
    ]);
    const activity = new Set<string>([
      ...(threadRows ?? []).map((r: { workspace_id: string }) => r.workspace_id),
      ...(oauthRows ?? []).map((r: { workspace_id: string }) => r.workspace_id),
      ...(taskRows ?? []).map((r: { workspace_id: string }) => r.workspace_id),
    ]);
    // Prefer an invited workspace (non-owner role) that has activity.
    const invitedWithActivity = memberships.find(
      (m) => m.role !== "owner" && activity.has(m.workspace_id as string),
    );
    if (invitedWithActivity) return invitedWithActivity.workspace_id as string;
    // Then any invited (non-owner) workspace.
    const invited = memberships.find((m) => m.role !== "owner");
    if (invited) return invited.workspace_id as string;
    // Then owned workspace with activity.
    const ownedWithActivity = memberships.find((m) => activity.has(m.workspace_id as string));
    if (ownedWithActivity) return ownedWithActivity.workspace_id as string;
    return memberships[0].workspace_id as string;
  }


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
          { id: userId, email: email ?? null, full_name: fullName ?? null, onboarded: false },
          { onConflict: "id" },
        );
    }

    const name = fullName || email?.split("@")[0] || "My Workspace";
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