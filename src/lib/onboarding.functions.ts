import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FinishInput = z.object({
  workspaceName: z.string().min(1).max(120),
  workspaceSlug: z.string().max(120).optional().default(""),
  businessType: z.string().max(60).optional().default(""),
  invites: z.array(z.string().email()).max(50).default([]),
  accounts: z
    .array(z.object({ provider: z.string().max(40), email: z.string().email() }))
    .max(20)
    .default([]),
});

export const finishOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => FinishInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: exErr } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (exErr) throw exErr;

    let workspaceId = existing?.id as string | undefined;

    if (!workspaceId) {
      const baseSlug =
        (data.workspaceSlug || data.workspaceName || "workspace")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "workspace";
      const slug = `${baseSlug}-${userId.slice(0, 6)}-${Date.now().toString(36)}`;
      const { data: ws, error } = await supabaseAdmin
        .from("workspaces")
        .insert({
          owner_id: userId,
          name: data.workspaceName || "My Workspace",
          slug,
          business_type: data.businessType || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      workspaceId = ws.id as string;
      await supabaseAdmin
        .from("workspace_members")
        .upsert(
          { workspace_id: workspaceId, user_id: userId, role: "owner" },
          { onConflict: "workspace_id,user_id" },
        );
    } else if (data.workspaceName || data.businessType) {
      const { error: updateErr } = await supabaseAdmin
        .from("workspaces")
        .update({
          ...(data.workspaceName ? { name: data.workspaceName } : {}),
          ...(data.businessType ? { business_type: data.businessType } : {}),
        })
        .eq("id", workspaceId);
      if (updateErr) throw updateErr;
    }

    if (workspaceId && data.invites.length > 0) {
      const { error: invErr } = await supabaseAdmin
        .from("workspace_invites")
        .insert(data.invites.map((email) => ({ workspace_id: workspaceId!, email })));
      if (invErr) throw invErr;
    }
    if (workspaceId && data.accounts.length > 0) {
      const { error: accErr } = await supabaseAdmin
        .from("email_accounts")
        .insert(
          data.accounts.map((a) => ({
            workspace_id: workspaceId!,
            provider: a.provider,
            email: a.email,
          })),
        );
      if (accErr) throw accErr;
    }

    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update({ onboarded: true })
      .eq("id", userId);
    if (profErr) throw profErr;

    return { ok: true as const, workspaceId };
  });
