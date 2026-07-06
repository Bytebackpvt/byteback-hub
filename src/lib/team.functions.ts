import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCurrentWorkspaceId, type WorkspaceRole } from "@/lib/workspace.functions";

const RoleEnum = z.enum(["owner", "admin", "member", "viewer"]);

export type MemberRow = {
  id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type InviteRow = {
  id: string;
  email: string;
  role: WorkspaceRole;
  created_at: string;
};

async function assertAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRole> {
  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  const role = data?.role as WorkspaceRole | undefined;
  if (!role || (role !== "owner" && role !== "admin")) {
    throw new Error("Only owners and admins can manage the team.");
  }
  return role;
}

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) {
      return { workspaceId: null, members: [] as MemberRow[], invites: [] as InviteRow[], myRole: null as WorkspaceRole | null };
    }

    const [membersRes, invitesRes, meRes] = await Promise.all([
      context.supabase
        .from("workspace_members")
        .select("id, user_id, role, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true }),
      context.supabase
        .from("workspace_invites")
        .select("id, email, role, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);

    if (membersRes.error) throw membersRes.error;
    if (invitesRes.error) throw invitesRes.error;

    const userIds = (membersRes.data ?? []).map((m) => m.user_id);
    let profilesById = new Map<string, { email: string | null; full_name: string | null; avatar_url: string | null }>();
    if (userIds.length) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .in("id", userIds);
      profilesById = new Map(
        (profiles ?? []).map((p) => [p.id, { email: p.email, full_name: p.full_name, avatar_url: p.avatar_url }]),
      );
    }

    const members: MemberRow[] = (membersRes.data ?? []).map((m) => {
      const p = profilesById.get(m.user_id);
      return {
        id: m.id,
        user_id: m.user_id,
        role: m.role as WorkspaceRole,
        created_at: m.created_at,
        email: p?.email ?? null,
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      };
    });

    return {
      workspaceId,
      members,
      invites: (invitesRes.data ?? []) as InviteRow[],
      myRole: (meRes.data?.role ?? null) as WorkspaceRole | null,
    };
  });

const InviteInput = z.object({
  email: z.string().email().max(254),
  role: RoleEnum.default("member"),
});

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => InviteInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found");
    await assertAdmin(context.supabase, workspaceId, context.userId);
    if (data.role === "owner") throw new Error("Cannot invite as owner");

    // If a user with this email is already in profiles, add them directly as a member.
    const { data: existingProfile } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("email", data.email.toLowerCase())
      .maybeSingle();

    if (existingProfile?.id) {
      const { error } = await context.supabase
        .from("workspace_members")
        .insert({ workspace_id: workspaceId, user_id: existingProfile.id, role: data.role })
        .select("id")
        .single();
      if (error && !String(error.message).includes("duplicate")) throw error;
      return { added: true as const };
    }

    // Otherwise store an invite so they get added when they sign up.
    const { error } = await context.supabase
      .from("workspace_invites")
      .insert({ workspace_id: workspaceId, email: data.email.toLowerCase(), role: data.role });
    if (error) throw error;
    return { added: false as const };
  });

const RoleUpdateInput = z.object({
  memberId: z.string().uuid(),
  role: RoleEnum,
});

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => RoleUpdateInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found");
    const myRole = await assertAdmin(context.supabase, workspaceId, context.userId);
    if (data.role === "owner") throw new Error("Ownership cannot be reassigned here.");

    // Look up the target row
    const { data: target } = await context.supabase
      .from("workspace_members")
      .select("id, role, user_id, workspace_id")
      .eq("id", data.memberId)
      .maybeSingle();
    if (!target || target.workspace_id !== workspaceId) throw new Error("Member not found");
    if (target.role === "owner") throw new Error("Cannot change the owner's role.");
    if (myRole === "admin" && target.role === "admin" && target.user_id !== context.userId) {
      throw new Error("Admins cannot change other admins.");
    }

    const { error } = await context.supabase
      .from("workspace_members")
      .update({ role: data.role })
      .eq("id", data.memberId);
    if (error) throw error;
    return { ok: true as const };
  });

const RemoveInput = z.object({ memberId: z.string().uuid() });
export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => RemoveInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found");
    await assertAdmin(context.supabase, workspaceId, context.userId);
    const { data: target } = await context.supabase
      .from("workspace_members")
      .select("id, role, workspace_id")
      .eq("id", data.memberId)
      .maybeSingle();
    if (!target || target.workspace_id !== workspaceId) throw new Error("Member not found");
    if (target.role === "owner") throw new Error("Cannot remove the owner.");
    const { error } = await context.supabase
      .from("workspace_members")
      .delete()
      .eq("id", data.memberId);
    if (error) throw error;
    return { ok: true as const };
  });

const CancelInviteInput = z.object({ inviteId: z.string().uuid() });
export const cancelInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => CancelInviteInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found");
    await assertAdmin(context.supabase, workspaceId, context.userId);
    const { error } = await context.supabase
      .from("workspace_invites")
      .delete()
      .eq("id", data.inviteId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return { ok: true as const };
  });
