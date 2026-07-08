import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Gmail OAuth callback. Exchanges the auth code for tokens, encrypts them,
 * and stores a row in oauth_connections tied to the user + workspace that
 * initiated the flow (looked up via the state token we stashed in sync_state).
 */
export const Route = createFileRoute("/api/public/oauth/gmail/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const err = url.searchParams.get("error");
        const origin = `${url.protocol}//${url.host}`;
        const backTo = `${origin}/app/email-sources`;

        if (err) throw redirect({ href: `${backTo}?error=${encodeURIComponent(err)}` });
        if (!code || !state) throw redirect({ href: `${backTo}?error=missing_code_or_state` });

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          throw redirect({ href: `${backTo}?error=server_not_configured` });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { encryptToken } = await import("@/lib/email-ingest.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const admin = supabaseAdmin as any;

        // Recover workspace + user from the state we stashed in sync_state
        const { data: stateRow } = await admin
          .from("sync_state")
          .select("workspace_id, cursor")
          .eq("source", `gmail_oauth_state:${state}`)
          .maybeSingle();
        if (!stateRow?.workspace_id || !stateRow?.cursor) {
          throw redirect({ href: `${backTo}?error=invalid_state` });
        }
        const workspaceId = stateRow.workspace_id as string;
        const userId = stateRow.cursor as string;

        // Exchange code for tokens
        const tokRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: `${origin}/api/public/oauth/gmail/callback`,
            grant_type: "authorization_code",
          }),
        });
        if (!tokRes.ok) {
          const txt = await tokRes.text();
          console.error("[oauth.gmail.callback] token exchange failed", tokRes.status, txt);
          throw redirect({ href: `${backTo}?error=token_exchange_failed` });
        }
        const tok = (await tokRes.json()) as {
          access_token: string;
          refresh_token?: string;
          expires_in: number;
          scope?: string;
          token_type: string;
        };

        // Fetch profile email
        const profRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { authorization: `Bearer ${tok.access_token}` },
        });
        const prof = profRes.ok
          ? ((await profRes.json()) as { email?: string; name?: string })
          : { email: undefined, name: undefined };
        const accountEmail = (prof.email ?? "").toLowerCase();

        const accessEnc = await encryptToken(tok.access_token);
        const refreshEnc = tok.refresh_token ? await encryptToken(tok.refresh_token) : null;

        await admin.from("oauth_connections").upsert(
          {
            workspace_id: workspaceId,
            user_id: userId,
            provider: "gmail",
            account_email: accountEmail,
            account_label: prof.name ?? accountEmail,
            access_token_enc: accessEnc,
            refresh_token_enc: refreshEnc,
            expires_at: new Date(Date.now() + tok.expires_in * 1000).toISOString(),
            scopes: (tok.scope ?? "").split(" ").filter(Boolean),
            status: "active",
            last_error: null,
          },
          { onConflict: "workspace_id,user_id,provider,account_email" },
        );

        // clean up the one-shot state row
        await admin
          .from("sync_state")
          .delete()
          .eq("source", `gmail_oauth_state:${state}`);

        throw redirect({ href: `${backTo}?connected=${encodeURIComponent(accountEmail)}` });
      },
    },
  },
});
