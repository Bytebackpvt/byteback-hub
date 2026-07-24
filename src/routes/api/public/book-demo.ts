import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { sendAppEmail } from "@/lib/email/send-app-email.server";

const BookDemoSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  company: z.string().trim().max(160).optional().default(""),
  message: z.string().trim().max(2000).optional().default(""),
});

const SALES_INBOX = "anjali@byteback.co.in";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export const Route = createFileRoute("/api/public/book-demo")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "content-type",
          },
        }),
      POST: async ({ request }) => {
        const cors = {
          "Access-Control-Allow-Origin": "*",
          "content-type": "application/json",
        };
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
            status: 400,
            headers: cors,
          });
        }
        const parsed = BookDemoSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ ok: false, error: "validation", details: parsed.error.flatten() }),
            { status: 400, headers: cors },
          );
        }
        const { name, email, company, message } = parsed.data;

        const submittedAt = new Date().toISOString();
        const html = `
          <div style="font-family:system-ui,sans-serif;color:#0f172a;padding:8px 0">
            <h2 style="margin:0 0 12px;font-size:18px">New demo request — ByteBack</h2>
            <table style="border-collapse:collapse;font-size:14px">
              <tr><td style="padding:4px 12px 4px 0;color:#64748b">Name</td><td><b>${esc(name)}</b></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#64748b">Email</td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#64748b">Company</td><td>${esc(company || "—")}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#64748b;vertical-align:top">Message</td><td style="white-space:pre-wrap">${esc(message || "—")}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#64748b">Submitted</td><td>${esc(submittedAt)}</td></tr>
            </table>
            <p style="margin-top:16px;color:#64748b;font-size:12px">
              Reply directly to this email to reach the requester.
            </p>
          </div>`;
        const text = [
          "New demo request — ByteBack",
          `Name: ${name}`,
          `Email: ${email}`,
          `Company: ${company || "—"}`,
          `Message: ${message || "—"}`,
          `Submitted: ${submittedAt}`,
        ].join("\n");

        // 1. Notify sales inbox
        const notify = await sendAppEmail({
          to: SALES_INBOX,
          subject: `Demo request — ${name}${company ? ` (${company})` : ""}`,
          html,
          text,
          label: "book-demo-notify",
          idempotencyKey: `demo-${email}-${Date.now()}`,
        });

        // 2. Confirmation to the requester (best-effort)
        await sendAppEmail({
          to: email,
          subject: "We got your demo request — ByteBack",
          html: `
            <div style="font-family:system-ui,sans-serif;color:#0f172a">
              <h2 style="margin:0 0 12px;font-size:18px">Thanks, ${esc(name)} 👋</h2>
              <p>We've received your demo request for ByteBack Inbox AI. Anjali from our team will reach out within one business day to schedule a 20-minute walkthrough.</p>
              <p style="margin-top:16px;color:#64748b;font-size:13px">Meanwhile you can start a free workspace at <a href="https://byteback.digital">byteback.digital</a>.</p>
              <p style="margin-top:24px;color:#64748b;font-size:12px">— Team ByteBack</p>
            </div>`,
          text: `Thanks, ${name}!\n\nWe received your demo request. Anjali will reach out within one business day.\n\n— Team ByteBack`,
          label: "book-demo-ack",
          idempotencyKey: `demo-ack-${email}`,
        });

        if (!notify.ok) {
          return new Response(
            JSON.stringify({ ok: false, error: "email_failed", reason: notify.reason }),
            { status: 500, headers: cors },
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
      },
    },
  },
});
