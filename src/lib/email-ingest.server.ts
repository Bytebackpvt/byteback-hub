/**
 * Shared email ingestion pipeline used by:
 *   - Instantly sync (src/lib/sync.functions.ts)
 *   - Gmail sync (src/lib/gmail.functions.ts)
 *   - Inbound webhook (src/routes/api/public/inbound.email.ts)
 *
 * Runs with the service-role admin client. Callers must have already
 * authorized the workspace context (auth middleware, verified token, etc.).
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBED_MODEL = "google/gemini-embedding-001";

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function companyFromEmail(email?: string): string {
  if (!email) return "";
  const domain = (email.split("@")[1] ?? "").split(".")[0] ?? "";
  return domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : "";
}

export function nameFromEmail(email: string): string {
  return email
    .split("@")[0]
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function classify(subject: string, body: string, interest?: number) {
  const t = `${subject} ${body}`.toLowerCase();
  let category = "unknown";
  let priority: "hot" | "warm" | "cold" = "cold";
  let confidence = 0.4;

  const isAutoReply =
    /^(auto(matic)?[- ]?reply|out of office|on leave|auto:|re: automatic reply)/i.test(subject) ||
    /this is an auto(matic)?[- ]?reply|automatic reply|auto[- ]?generated|do[- ]?not[- ]?reply/.test(t) ||
    /out of (the )?office|on vacation|on (annual|sick|medical|maternity|paternity) leave|on leave|\booo\b|away from (my |the )?(office|desk)|will be (back|out|away)|currently (out|away|unavailable)|no longer (with|works)/.test(t);

  if (/unsubscribe|remove me|opt.?out/.test(t)) category = "spam";
  else if (isAutoReply) category = "out_of_office";
  else if (/pricing|price|cost|rate|quote/.test(t)) category = "pricing_request";
  else if (/demo|walkthrough/.test(t)) category = "demo_request";
  else if (/(book|schedule|meeting|call).{0,40}(time|slot|when)/.test(t) || /calendly/.test(t))
    category = "meeting_request";
  else if (/rental|rent|lease/.test(t)) category = "rental_inquiry";
  else if (/amc\b|maintenance/.test(t)) category = "amc_inquiry";
  else if (/refurbished|used laptop/.test(t)) category = "refurbished_devices";
  else if (/pickup|collect/.test(t)) category = "pickup_request";
  else if (/interested|tell me more|sounds good/.test(t)) category = "interested";

  if (category === "spam" || category === "out_of_office") {
    priority = "cold";
    confidence = 0.95;
  } else if (
    (interest === 1 || /\burgent\b|\basap\b|budget approved/.test(t)) &&
    !/for (any )?urgent|in case of urgent|urgent (matters|assistance|help|queries|please contact|please call)/.test(t)
  ) {
    // Real buying urgency — not the "for urgent matters call X" OOO boilerplate.
    priority = "hot";
    confidence = 0.85;
  } else if (category === "pricing_request" || category === "demo_request" || category === "meeting_request") {
    priority = "warm";
    confidence = 0.7;
  }

  return { category, priority, confidence };
}

export function scoreFrom(priority: "hot" | "warm" | "cold", category: string): number {
  const base = priority === "hot" ? 80 : priority === "warm" ? 55 : 25;
  const bump = /pricing|meeting|demo/.test(category) ? 10 : 0;
  return Math.min(100, base + bump);
}

export function valueEstimate(category: string, priority: "hot" | "warm" | "cold"): number {
  const table: Record<string, number> = {
    pricing_request: 250000,
    demo_request: 150000,
    meeting_request: 200000,
    rental_inquiry: 120000,
    amc_inquiry: 80000,
    refurbished_devices: 60000,
    pickup_request: 40000,
    interested: 100000,
    unknown: 30000,
    spam: 0,
    out_of_office: 0,
  };
  const base = table[category] ?? 30000;
  const mult = priority === "hot" ? 1.5 : priority === "warm" ? 1 : 0.5;
  return Math.round(base * mult);
}

async function embed(text: string): Promise<number[] | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(EMBED_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    return j.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

export type IngestInput = {
  workspaceId: string;
  emailId: string;
  fromEmail: string;
  fromName?: string;
  subject?: string;
  bodyText: string;
  receivedAt?: string;
  source: string; // 'instantly' | 'gmail' | 'inbound' | ...
  mailbox?: string | null;
  meta?: Record<string, unknown>;
  aiInterest?: number;
};

export type IngestOutcome = {
  ok: boolean;
  contactId?: string;
  category?: string;
  priority?: string;
  embedded?: boolean;
  reason?: string;
};

/**
 * Idempotent email ingest. Upserts contact/thread/deal, emits a timeline
 * event, updates lead score, and generates an embedding when possible.
 */
export async function ingestEmail(input: IngestInput): Promise<IngestOutcome> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;
  const {
    workspaceId,
    emailId,
    source,
    mailbox = null,
    meta = {},
    aiInterest,
  } = input;
  const fromEmail = input.fromEmail.toLowerCase().trim();
  if (!fromEmail || !emailId) return { ok: false, reason: "missing fields" };

  const fromName = input.fromName?.trim() || nameFromEmail(fromEmail);
  const company = companyFromEmail(fromEmail);
  const bodyText = input.bodyText ?? "";
  const subject = input.subject ?? "(no subject)";
  const receivedAt = input.receivedAt ?? new Date().toISOString();
  const { category, priority, confidence } = classify(subject, bodyText, aiInterest);

  const { data: contact, error: contactErr } = await admin
    .from("contacts")
    .upsert(
      {
        workspace_id: workspaceId,
        email: fromEmail,
        name: fromName,
        company,
        source,
        last_seen_at: receivedAt,
      },
      { onConflict: "workspace_id,email" },
    )
    .select("id")
    .maybeSingle();
  if (contactErr) return { ok: false, reason: contactErr.message };

  await admin.from("email_threads").upsert(
    {
      workspace_id: workspaceId,
      thread_id: emailId,
      contact_id: contact?.id ?? null,
      contact_email: fromEmail,
      subject,
      last_body: bodyText.slice(0, 4000),
      mailbox,
      source,
      category,
      priority,
      confidence,
      last_received_at: receivedAt,
      meta,
    },
    { onConflict: "workspace_id,thread_id" },
  );

  const stage = priority === "hot" ? "interested" : category === "meeting_request" ? "meeting" : "new";
  await admin.from("deals").upsert(
    {
      workspace_id: workspaceId,
      contact_id: contact?.id ?? null,
      thread_id: emailId,
      stage,
      category,
      priority,
      confidence,
      value_estimate: valueEstimate(category, priority),
      source,
      last_activity_at: receivedAt,
    },
    { onConflict: "workspace_id,thread_id" },
  );

  await admin.from("ai_events").insert({
    workspace_id: workspaceId,
    thread_id: emailId,
    lead_email: fromEmail,
    event_type: "classified",
    title: `Classified as ${category.replace(/_/g, " ")}`,
    detail: subject.slice(0, 200),
    category,
    confidence,
    next_action: priority === "hot" ? "reply_immediately" : priority === "warm" ? "send_pricing" : "wait",
    reason: `priority=${priority}`,
    meta: { source } as never,
  });

  await admin.from("lead_scores").upsert(
    {
      workspace_id: workspaceId,
      lead_key: fromEmail,
      score: scoreFrom(priority, category),
      reason: `${category} • ${priority}`,
    },
    { onConflict: "workspace_id,lead_key" },
  );

  let embedded = false;
  if (bodyText.length > 30) {
    const vec = await embed(`${subject}\n\n${bodyText}`);
    if (vec) {
      await admin.from("email_embeddings").upsert(
        {
          workspace_id: workspaceId,
          thread_id: emailId,
          subject,
          content: bodyText.slice(0, 6000),
          contact_name: fromName,
          contact_email: fromEmail,
          company,
          category,
          embedding: vec,
          metadata: {},
        },
        { onConflict: "workspace_id,thread_id" },
      );
      embedded = true;
    }
  }

  return { ok: true, contactId: contact?.id, category, priority, embedded };
}

/* ============ Token encryption (AES-256-GCM using TOKEN_ENC_KEY) ============ */

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENC_KEY;
  if (!raw) throw new Error("TOKEN_ENC_KEY not configured");
  // Accept hex (64 chars), base64, or plain 32-byte string
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  const b64 = Buffer.from(raw, "base64");
  if (b64.length === 32) return b64;
  const utf = Buffer.from(raw, "utf8");
  if (utf.length === 32) return utf;
  // fallback: SHA-256 stretch
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require("crypto") as typeof import("crypto");
  return createHash("sha256").update(raw).digest();
}

function unwrapStoredTokenBytes(buf: Buffer): Buffer {
  // Older rows were saved from a Worker Buffer polyfill, which PostgREST stored
  // as JSON text: {"type":"Buffer","data":[...]}. Accept both that shape and
  // the intended raw AES-GCM byte payload so existing Gmail connections recover.
  if (buf[0] !== 0x7b) return buf;
  try {
    const parsed = JSON.parse(buf.toString("utf8")) as { type?: string; data?: unknown };
    if (
      parsed?.type === "Buffer" &&
      Array.isArray(parsed.data) &&
      parsed.data.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
    ) {
      return Buffer.from(parsed.data as number[]);
    }
  } catch {
    // Not JSON; fall through to the raw bytes.
  }
  return buf;
}

export async function encryptToken(plaintext: string): Promise<string> {
  const { randomBytes, createCipheriv } = await import("crypto");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `\\x${Buffer.concat([iv, tag, enc]).toString("hex")}`;
}

export async function decryptToken(blob: Buffer | Uint8Array | string): Promise<string> {
  const { createDecipheriv } = await import("crypto");
  let buf: Buffer;
  if (typeof blob === "string") {
    // Supabase returns bytea as \x-hex string
    const hex = blob.startsWith("\\x") ? blob.slice(2) : blob;
    buf = Buffer.from(hex, "hex");
  } else {
    buf = Buffer.from(blob);
  }
  buf = unwrapStoredTokenBytes(buf);
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}
