/**
 * Account self-service: revoke all Google OAuth tokens, disconnect all
 * mailboxes, and fully delete the ByteBack account + user data.
 *
 * These endpoints power the in-app Delete Account / Disconnect flow that
 * Google verification reviewers must be able to see in the demo video.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
  } catch {
    /* best-effort */
  }
}

/** Disconnect ALL connected email accounts for the current user.
 *  Revokes Google tokens and deletes oauth_connections rows. */
/** Disconnect a SINGLE connected email account by id.
 *  Revokes its Google token then deletes the row. */
export const disconnectOneAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectionId: string }) => {
    if (!d || typeof d.connectionId !== "string") throw new Error("connectionId required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { decryptToken } = await import("@/lib/email-ingest.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    const { data: conn } = await admin
      .from("oauth_connections")
      .select("id, account_email, refresh_token_enc, access_token_enc, user_id")
      .eq("id", data.connectionId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!conn) return { ok: false as const, error: "Not found" };

    try {
      if (conn.refresh_token_enc) {
        const rt = await decryptToken(conn.refresh_token_enc);
        if (rt) await revokeGoogleToken(rt);
      } else if (conn.access_token_enc) {
        const at = await decryptToken(conn.access_token_enc);
        if (at) await revokeGoogleToken(at);
      }
    } catch { /* best-effort */ }

    await admin.from("oauth_connections").delete().eq("id", conn.id).eq("user_id", context.userId);
    return { ok: true as const, email: conn.account_email as string | null };
  });

export const disconnectAllAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { decryptToken } = await import("@/lib/email-ingest.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    const { data: conns } = await admin
      .from("oauth_connections")
      .select("id, refresh_token_enc, access_token_enc")
      .eq("user_id", context.userId);

    for (const c of conns ?? []) {
      try {
        if (c.refresh_token_enc) {
          const rt = await decryptToken(c.refresh_token_enc);
          if (rt) await revokeGoogleToken(rt);
        } else if (c.access_token_enc) {
          const at = await decryptToken(c.access_token_enc);
          if (at) await revokeGoogleToken(at);
        }
      } catch {
        /* keep going */
      }
    }

    await admin.from("oauth_connections").delete().eq("user_id", context.userId);
    return { ok: true, disconnected: conns?.length ?? 0 };
  });

/** Permanently delete the current user's account and all associated data.
 *  - Revokes Google OAuth tokens
 *  - Deletes oauth_connections, workspace_members, and owned workspaces
 *    (cascades emails / contacts / tasks / embeddings via FK)
 *  - Deletes the auth user (signs them out everywhere) */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { decryptToken } = await import("@/lib/email-ingest.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const userId = context.userId;

    // 1) Revoke Google tokens (best-effort)
    const { data: conns } = await admin
      .from("oauth_connections")
      .select("refresh_token_enc, access_token_enc")
      .eq("user_id", userId);
    for (const c of conns ?? []) {
      try {
        if (c.refresh_token_enc) {
          const rt = await decryptToken(c.refresh_token_enc);
          if (rt) await revokeGoogleToken(rt);
        }
      } catch { /* noop */ }
    }

    // 2) Delete OAuth connections
    await admin.from("oauth_connections").delete().eq("user_id", userId);

    // 3) Delete workspaces the user owns (cascades related tables via FKs).
    //    Any workspace where they are only a member: remove their membership.
    const { data: owned } = await admin
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId);
    for (const w of owned ?? []) {
      await admin.from("workspaces").delete().eq("id", w.id);
    }
    await admin.from("workspace_members").delete().eq("user_id", userId);

    // 4) Delete the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return { ok: false as const, error: delErr.message };
    }

    return { ok: true as const };
  });
