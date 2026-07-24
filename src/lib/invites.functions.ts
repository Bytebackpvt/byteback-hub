import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TokenInput = z.object({ token: z.string().uuid() });

/**
 * Public — fetch invite preview by token (workspace name, role, email).
 * Uses the service role (via dynamic import) so it works before sign-in.
 */
export const getInviteByToken = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => TokenInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row } = await (supabaseAdmin as any)
      .from("workspace_invites")
      .select("id, email, role, workspace_id, accepted_at, workspaces:workspace_id(name)")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) return { found: false as const, reason: "invalid" as const };

    // If the invited address already has an account and membership, show a
    // useful state instead of a generic invalid-link message.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id")
      .eq("email", (row.email as string).toLowerCase())
      .maybeSingle();

    let alreadyMember = false;
    if (profile?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: membership } = await (supabaseAdmin as any)
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", row.workspace_id)
        .eq("user_id", profile.id)
        .maybeSingle();
      alreadyMember = Boolean(membership?.id);
    }

    return {
      found: true as const,
      email: row.email as string,
      role: row.role as string,
      workspaceId: row.workspace_id as string,
      workspaceName: (row.workspaces?.name as string | undefined) ?? "a workspace",
      acceptedAt: row.accepted_at as string | null,
      status: row.accepted_at
        ? ("accepted" as const)
        : alreadyMember
          ? ("already_member" as const)
          : ("pending" as const),
    };
  });

/**
 * Authenticated — accept invite. Adds current user to the workspace and marks invite accepted.
 * Requires the signed-in user's email to match the invite email.
 */
export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => TokenInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invite } = await (supabaseAdmin as any)
      .from("workspace_invites")
      .select("id, email, role, workspace_id, accepted_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) throw new Error("Invite not found or has been revoked.");

    // Verify email match
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const myEmail = userRes?.user?.email?.toLowerCase();
    if (!myEmail || myEmail !== (invite.email as string).toLowerCase()) {
      throw new Error(
        `This invite was sent to ${invite.email}. Please sign in with that email address.`,
      );
    }

    // If they're already in this workspace, make the invite look accepted and
    // let them continue instead of failing with a duplicate-member error.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingMembership } = await (supabaseAdmin as any)
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", invite.workspace_id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (existingMembership?.id || invite.accepted_at) {
      if (!invite.accepted_at) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabaseAdmin as any)
          .from("workspace_invites")
          .update({ accepted_at: new Date().toISOString() })
          .eq("id", invite.id);
      }
      return { ok: true as const, workspaceId: invite.workspace_id as string };
    }

    // Insert membership (ignore if already a member)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: memErr } = await (supabaseAdmin as any)
      .from("workspace_members")
      .insert({
        workspace_id: invite.workspace_id,
        user_id: context.userId,
        role: invite.role,
      });
    if (memErr && !String(memErr.message).includes("duplicate")) throw memErr;

    // Mark accepted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("workspace_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    // Mark profile onboarded so they can enter the app immediately.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("profiles")
      .update({ onboarded: true })
      .eq("id", context.userId);

    return { ok: true as const, workspaceId: invite.workspace_id as string };
  });
