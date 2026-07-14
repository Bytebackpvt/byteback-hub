import { createFileRoute } from "@tanstack/react-router";

/**
 * Public unsubscribe endpoint.
 *  - GET  ?token=…  → validate token, return the associated email
 *  - POST { token } → mark digest emails off + record in suppressed_emails
 */
export const Route = createFileRoute("/api/public/email/unsubscribe")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        if (!token) return Response.json({ ok: false, error: "missing_token" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabaseAdmin as any)
          .from("email_unsubscribe_tokens")
          .select("email, used_at")
          .eq("token", token)
          .maybeSingle();
        if (!data) return Response.json({ ok: false, error: "invalid_token" }, { status: 404 });
        return Response.json({
          ok: true,
          email: data.email as string,
          alreadyUnsubscribed: Boolean(data.used_at),
        });
      },
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const token = typeof body?.token === "string" ? body.token : "";
        if (!token) return Response.json({ ok: false, error: "missing_token" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const admin = supabaseAdmin as any;

        const { data: row } = await admin
          .from("email_unsubscribe_tokens")
          .select("email")
          .eq("token", token)
          .maybeSingle();
        if (!row?.email) {
          return Response.json({ ok: false, error: "invalid_token" }, { status: 404 });
        }
        const email = row.email as string;

        // 1. Mark this token used.
        await admin
          .from("email_unsubscribe_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("token", token);

        // 2. Suppress future app emails to this address.
        await admin
          .from("suppressed_emails")
          .upsert({ email, reason: "unsubscribed" }, { onConflict: "email" });

        // 3. Best-effort: flip digest.email = false for this user's prefs
        //    (only affects the daily digest — auth/critical mail stays on).
        try {
          const { data: userRes } = await admin.auth.admin.listUsers();
          const user = userRes?.users?.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase());
          if (user?.id) {
            const { data: prefRows } = await admin
              .from("notification_preferences")
              .select("id, prefs")
              .eq("user_id", user.id);
            for (const p of prefRows ?? []) {
              const prefs = { ...(p.prefs ?? {}) } as Record<string, Record<string, boolean>>;
              prefs.digest = { ...(prefs.digest ?? {}), email: false };
              await admin
                .from("notification_preferences")
                .update({ prefs })
                .eq("id", p.id);
            }
          }
        } catch (e) {
          console.warn("unsubscribe prefs flip failed", (e as Error).message);
        }

        return Response.json({ ok: true, email });
      },
    },
  },
});
