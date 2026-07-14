/**
 * Server-only helper: enqueue an app (transactional) email onto the
 * `transactional_emails` pgmq queue. The queue processor at
 * `/lovable/email/queue/process` picks it up and hands it to Lovable Emails,
 * which sends from the verified `notify.byteback.digital` domain.
 *
 * Handles:
 *  - suppression check (bounces/complaints/unsubscribes) — silently skips
 *  - unsubscribe token generation & persistence
 *  - required payload shape (message_id, unsubscribe_token, queued_at, …)
 */

import { randomUUID, randomBytes } from "crypto";

export type SendAppEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Short label used for logs/analytics (`invite`, `daily-digest`, …). */
  label: string;
  /** Idempotency guard — same key = same email, safe to retry. */
  idempotencyKey?: string;
};

export type SendAppEmailResult =
  | { ok: true; messageId: string; queued: true }
  | { ok: false; reason: "suppressed" | "missing_env" | "enqueue_failed"; error?: string };

const APP_URL = "https://byteback.digital";
const FROM = "ByteBack <hello@notify.byteback.digital>";
const SENDER_DOMAIN = "notify.byteback.digital";

async function getOrCreateUnsubscribeToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  email: string,
): Promise<string> {
  const existing = await admin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", email)
    .maybeSingle();
  const found = existing.data?.token as string | undefined;
  if (found) return found;
  const token = randomBytes(24).toString("hex");
  await admin
    .from("email_unsubscribe_tokens")
    .insert({ email, token });
  return token;
}

export async function sendAppEmail(input: SendAppEmailInput): Promise<SendAppEmailResult> {
  const toEmail = input.to.trim().toLowerCase();
  if (!toEmail) return { ok: false, reason: "enqueue_failed", error: "missing_recipient" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Suppression check — bounces / complaints / previous unsubscribes.
  const supp = await supabaseAdmin
    .from("suppressed_emails")
    .select("email")
    .eq("email", toEmail)
    .maybeSingle();
  if (supp.data) return { ok: false, reason: "suppressed" };

  const unsubscribeToken = await getOrCreateUnsubscribeToken(supabaseAdmin, toEmail);
  const unsubscribeUrl = `${APP_URL}/email/unsubscribe?token=${unsubscribeToken}`;

  // Append a lightweight footer with the unsubscribe link if the caller didn't
  // already include one. Keeps templates simple and satisfies deliverability.
  const html = input.html.includes("/email/unsubscribe")
    ? input.html
    : `${input.html}
<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;font-family:system-ui,sans-serif">
  You're receiving this from ByteBack. <a href="${unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline">Unsubscribe</a>.
</div>`;

  const messageId = randomUUID();
  const payload = {
    to: toEmail,
    from: FROM,
    sender_domain: SENDER_DOMAIN,
    subject: input.subject,
    html,
    text: input.text ?? undefined,
    purpose: "transactional",
    label: input.label,
    message_id: messageId,
    idempotency_key: input.idempotencyKey ?? `${input.label}-${messageId}`,
    unsubscribe_token: unsubscribeToken,
    queued_at: new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin as any).rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload,
  });
  if (error) {
    return { ok: false, reason: "enqueue_failed", error: error.message };
  }
  return { ok: true, messageId, queued: true };
}
