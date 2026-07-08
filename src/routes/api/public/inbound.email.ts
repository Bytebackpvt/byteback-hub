import { createFileRoute } from "@tanstack/react-router";

/**
 * Universal inbound email webhook.
 *
 * ANY email-inbound provider (Resend Inbound, SendGrid Inbound Parse,
 * Mailgun Routes, Cloudflare Email Workers, Postmark, Zapier, n8n, or a
 * user's own script that scrapes IMAP) can POST here to feed a workspace's
 * pipeline. This is the USP: no OAuth required, works with any domain
 * or mailbox the user controls.
 *
 * URL:
 *   POST /api/public/inbound/email?token=<workspace inbound_token>
 *
 * Accepts either:
 *
 *  A) Native JSON:
 *     {
 *       "from": "sender@company.com",
 *       "name": "Sender Name",              // optional
 *       "subject": "...",
 *       "text": "...",                      // or "html"
 *       "html": "...",
 *       "message_id": "unique-id",          // optional; falls back to a hash
 *       "received_at": "2025-01-01T00:00:00Z"  // optional
 *     }
 *
 *  B) Resend Inbound webhook shape:
 *     { "type": "email.received", "data": { "from": {...}, "subject": ..., "text": ..., "html": ..., "id": ..., "created_at": ... } }
 *
 *  C) SendGrid Inbound Parse form-data with fields: from, subject, text, html
 */
export const Route = createFileRoute("/api/public/inbound/email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? request.headers.get("x-inbound-token") ?? "";
        if (!token || token.length < 16) {
          return new Response("missing token", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { ingestEmail, stripHtml } = await import("@/lib/email-ingest.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const admin = supabaseAdmin as any;

        const { data: ws } = await admin
          .from("workspaces")
          .select("id")
          .eq("inbound_token", token)
          .maybeSingle();
        if (!ws?.id) return new Response("invalid token", { status: 401 });

        // Parse body: JSON or multipart form
        let payload: Record<string, unknown> = {};
        const ct = request.headers.get("content-type") ?? "";
        try {
          if (ct.includes("application/json")) {
            payload = (await request.json()) as Record<string, unknown>;
          } else if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
            const form = await request.formData();
            for (const [k, v] of form.entries()) payload[k] = typeof v === "string" ? v : "";
          } else {
            payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
          }
        } catch {
          return new Response("bad body", { status: 400 });
        }

        // Normalise to our shape
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p: any = payload;
        // Resend Inbound shape
        const d = p.data ?? p;

        function pickFromAddr(v: unknown): { email: string; name: string } {
          if (!v) return { email: "", name: "" };
          if (typeof v === "string") {
            const m = v.match(/^(.*?)<([^>]+)>$/);
            if (m) return { name: m[1].replace(/["']/g, "").trim(), email: m[2].trim().toLowerCase() };
            return { name: "", email: v.trim().toLowerCase() };
          }
          if (typeof v === "object") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const o = v as any;
            const email = String(o.address ?? o.email ?? "").toLowerCase().trim();
            const name = String(o.name ?? "").trim();
            return { email, name };
          }
          return { email: "", name: "" };
        }

        const fromCandidate = d.from ?? d.From ?? d.sender;
        const from = Array.isArray(fromCandidate) ? pickFromAddr(fromCandidate[0]) : pickFromAddr(fromCandidate);
        if (!from.email) return Response.json({ ok: false, error: "no from address" }, { status: 400 });

        const subject = String(d.subject ?? d.Subject ?? "").slice(0, 500) || "(no subject)";
        const text = String(d.text ?? d.Text ?? d["text-plain"] ?? "");
        const html = String(d.html ?? d.Html ?? d["text-html"] ?? "");
        const bodyText = text || (html ? stripHtml(html) : "");
        const messageId = String(
          d.message_id ?? d.messageId ?? d.id ?? d["Message-Id"] ?? d["Message-ID"] ?? "",
        ).trim();
        const emailId =
          messageId ||
          `inbound:${from.email}:${await hashShort(subject + bodyText.slice(0, 200))}`;
        const receivedAt =
          d.received_at ?? d.receivedAt ?? d.created_at ?? d.date ?? new Date().toISOString();

        const outcome = await ingestEmail({
          workspaceId: ws.id,
          emailId,
          fromEmail: from.email,
          fromName: from.name || p.name,
          subject,
          bodyText,
          receivedAt: String(receivedAt),
          source: "inbound",
          mailbox: null,
          meta: { provider: request.headers.get("user-agent") ?? "unknown" },
        });

        return Response.json({ ok: outcome.ok, category: outcome.category, priority: outcome.priority });
      },
    },
  },
});

async function hashShort(s: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha1").update(s).digest("hex").slice(0, 16);
}
