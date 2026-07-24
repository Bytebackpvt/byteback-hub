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
  token: string | null;
  accepted_at: string | null;
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
        .select("id, email, role, created_at, token, accepted_at")
        .eq("workspace_id", workspaceId)
        .is("accepted_at", null)
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
  origin: z.string().url().optional(),
});

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => InviteInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await getCurrentWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found");
    await assertAdmin(context.supabase, workspaceId, context.userId);
    if (data.role === "owner") throw new Error("Cannot invite as owner");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const appUrl = (data.origin || process.env.APP_URL || "https://byteback.digital").replace(/\/$/, "");

    // If a user with this email already exists, add them directly as a member
    // and notify them. This lookup intentionally uses the admin client after
    // the caller has been verified as a workspace admin, because profiles are
    // otherwise only readable by their owner.
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("email", data.email.toLowerCase())
      .maybeSingle();

    // Fetch workspace name + inviter name for the email
    const [{ data: ws }, { data: inviter }] = await Promise.all([
      context.supabase.from("workspaces").select("name").eq("id", workspaceId).maybeSingle(),
      context.supabase.from("profiles").select("full_name, email").eq("id", context.userId).maybeSingle(),
    ]);
    const wsName = (ws?.name as string | undefined) ?? "your team";
    const inviterName = (inviter?.full_name as string | undefined) || (inviter?.email as string | undefined) || "A teammate";

    if (existingProfile?.id) {
      const { error } = await supabaseAdmin
        .from("workspace_members")
        .insert({ workspace_id: workspaceId, user_id: existingProfile.id, role: data.role })
        .select("id")
        .single();
      if (error && !String(error.message).includes("duplicate")) throw error;

      // Clear any old pending invite for the same user/workspace so the team
      // page does not keep showing an already-added teammate as pending.
      await supabaseAdmin
        .from("workspace_invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId)
        .eq("email", data.email.toLowerCase())
        .is("accepted_at", null);

      let emailed = false;
      try {
        const { sendAppEmail } = await import("@/lib/email/send-app-email.server");
        const res = await sendAppEmail({
          to: data.email.toLowerCase(),
          label: "team-invite",
          idempotencyKey: `member-added-${workspaceId}-${existingProfile.id}-${data.role}`,
          subject: `${inviterName} added you to ${wsName} on ByteBack`,
          text: `${inviterName} added you to the ${wsName} workspace on ByteBack as ${data.role}. Open ByteBack: ${appUrl}/app`,
          html: `
            <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
              <h2 style="margin:0 0 12px">You've been added to ${wsName}</h2>
              <p style="color:#475569;line-height:1.5">
                ${inviterName} added you to the <b>${wsName}</b> workspace on ByteBack as <b>${data.role}</b>.
              </p>
              <p style="margin:24px 0">
                <a href="${appUrl}/app" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">
                  Open ByteBack
                </a>
              </p>
              <p style="color:#94a3b8;font-size:12px">
                If the button doesn't work, paste this link:<br/>${appUrl}/app
              </p>
            </div>`,
        });
        emailed = res.ok;
        if (!res.ok) console.error("Member-added email failed", res);
      } catch (e) {
        console.error("Member-added email exception", e);
      }

      return { added: true as const, emailed };
    }

    // Otherwise store an invite so they get added when they sign up / click the link.
    const { data: inviteRow, error } = await supabaseAdmin
      .from("workspace_invites")
      .insert({ workspace_id: workspaceId, email: data.email.toLowerCase(), role: data.role, invited_by: context.userId })
      .select("token")
      .single();
    if (error && !String(error.message).includes("duplicate")) throw error;
    // If duplicate, fetch the existing token.
    let token = inviteRow?.token as string | undefined;
    if (!token) {
      const { data: existing } = await supabaseAdmin
        .from("workspace_invites")
        .select("token")
        .eq("workspace_id", workspaceId)
        .eq("email", data.email.toLowerCase())
        .is("accepted_at", null)
        .maybeSingle();
      token = existing?.token as string | undefined;
    }

    // Send the invitation email from notify.byteback.digital via the queue.
    let emailed = false;
    try {
      const acceptUrl = token
        ? `${appUrl}/invite/${token}`
        : `${appUrl}/auth?invite=${encodeURIComponent(data.email.toLowerCase())}`;
      const { sendAppEmail } = await import("@/lib/email/send-app-email.server");
      const res = await sendAppEmail({
        to: data.email.toLowerCase(),
        label: "team-invite",
        idempotencyKey: `invite-${token ?? data.email.toLowerCase()}`,
        subject: `${inviterName} invited you to ${wsName} on ByteBack`,
        text: `${inviterName} invited you to the ${wsName} workspace on ByteBack as ${data.role}. Accept invitation: ${acceptUrl}`,
        html: `
          <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
            <h2 style="margin:0 0 12px">You've been invited to ${wsName}</h2>
            <p style="color:#475569;line-height:1.5">
              ${inviterName} added you to the <b>${wsName}</b> workspace on ByteBack as <b>${data.role}</b>.
            </p>
            <p style="margin:24px 0">
              <a href="${acceptUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">
                Accept invitation
              </a>
            </p>
            <p style="color:#94a3b8;font-size:12px">
              If the button doesn't work, paste this link:<br/>${acceptUrl}
            </p>
          </div>`,
      });
      emailed = res.ok;
      if (!res.ok) {
        console.error("Invite email failed", res);
      }
    } catch (e) {
      console.error("Invite email exception", e);
    }

    return { added: false as const, emailed };
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
