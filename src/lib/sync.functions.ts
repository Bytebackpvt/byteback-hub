import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";

/**
 * AI Sync Engine
 *
 * Pulls new email replies from connected sources (currently Instantly),
 * classifies + extracts them, then upserts:
 *   contacts, email_threads, deals, ai_events (timeline), lead_scores,
 *   and email_embeddings (semantic memory).
 *
 * All writes use the service-role client so cron jobs can run without a
 * user session. The user-facing wrapper `runSyncForMe` gates access to
 * the caller's workspace only.
 */

const INSTANTLY_BASE = "https://api.instantly.ai/api/v2";
const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBED_MODEL = "google/gemini-embedding-001";

type RawEmail = {
  id: string;
  from_address_email?: string;
  from_address_json?: Array<{ name?: string; address?: string }>;
  subject?: string;
  body?: { text?: string; html?: string };
  timestamp_created?: string;
  timestamp_email?: string;
  ai_interest_value?: number;
  campaign_id?: string;
  eaccount?: string;
  thread_id?: string;
};

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function companyFromEmail(email?: string) {
  if (!email) return "";
  const domain = (email.split("@")[1] ?? "").split(".")[0] ?? "";
  return domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : "";
}

function nameFromEmail(email: string) {
  return email
    .split("@")[0]
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function classify(subject: string, body: string, interest?: number) {
  const t = `${subject} ${body}`.toLowerCase();
  let category = "unknown";
  let priority: "hot" | "warm" | "cold" = "cold";
  let confidence = 0.4;
  if (/unsubscribe|remove me|opt.?out/.test(t)) category = "spam";
  else if (/out of (the )?office|on vacation|on leave|\booo\b/.test(t)) category = "out_of_office";
  else if (/pricing|price|cost|rate|quote/.test(t)) category = "pricing_request";
  else if (/demo|walkthrough/.test(t)) category = "demo_request";
  else if (/(book|schedule|meeting|call).{0,40}(time|slot|when)/.test(t) || /calendly/.test(t))
    category = "meeting_request";
  else if (/rental|rent|lease/.test(t)) category = "rental_inquiry";
  else if (/amc\b|maintenance/.test(t)) category = "amc_inquiry";
  else if (/refurbished|used laptop/.test(t)) category = "refurbished_devices";
  else if (/pickup|collect/.test(t)) category = "pickup_request";
  else if (/interested|tell me more|sounds good/.test(t)) category = "interested";

  if (interest === 1 || /urgent|asap|budget approved/.test(t)) {
    priority = "hot";
    confidence = 0.85;
  } else if (interest === 2 || category === "meeting_request" || category === "demo_request" || category === "pricing_request") {
    priority = "warm";
    confidence = 0.7;
  } else if (category !== "unknown" && category !== "spam" && category !== "out_of_office") {
    priority = "warm";
    confidence = 0.6;
  }
  return { category, priority, confidence };
}

function scoreFrom(priority: "hot" | "warm" | "cold", category: string) {
  if (priority === "hot") return 90;
  if (priority === "warm") return category === "demo_request" || category === "pricing_request" ? 70 : 55;
  return 20;
}

function valueEstimate(category: string, priority: "hot" | "warm" | "cold") {
  // rough INR estimates so radar/dashboard has something to show
  const base: Record<string, number> = {
    rental_inquiry: 120000,
    amc_inquiry: 180000,
    itad_inquiry: 250000,
    itam_inquiry: 220000,
    laptop_purchase: 80000,
    refurbished_devices: 60000,
    demo_request: 100000,
    pricing_request: 90000,
    meeting_request: 100000,
    interested: 70000,
  };
  const v = base[category] ?? 40000;
  const mult = priority === "hot" ? 1.5 : priority === "warm" ? 1 : 0.5;
  return Math.round(v * mult);
}

async function embed(text: string): Promise<number[] | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(EMBED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    return json.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

async function fetchInstantly(key: string, limit: number): Promise<RawEmail[]> {
  const url = new URL(INSTANTLY_BASE + "/emails");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("email_type", "received");
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Instantly ${res.status}`);
  const json = (await res.json()) as { items?: RawEmail[] };
  return json.items ?? [];
}

async function loadWorkspaceInstantlyKeyAdmin(workspaceId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabaseAdmin as any)
    .from("workspace_integrations")
    .select("secret, status")
    .eq("workspace_id", workspaceId)
    .eq("provider", "instantly")
    .maybeSingle();
  if (!data?.secret || data.status !== "connected") return null;
  try {
    const { decryptSecret } = await import("@/lib/integrations/crypto.server");
    return await decryptSecret(data.secret as string);
  } catch {
    return data.secret as string;
  }
}


type SyncResult = {
  workspaceId: string;
  processed: number;
  contactsUpserted: number;
  threadsUpserted: number;
  dealsUpserted: number;
  embedded: number;
  skipped: number;
  error?: string;
};

/**
 * Core sync worker. Uses supabaseAdmin (service role) so it works from
 * both cron endpoints and authenticated flows.
 */
export async function runInstantlySync(workspaceId: string, opts?: { limit?: number }): Promise<SyncResult> {
  const limit = Math.max(10, Math.min(opts?.limit ?? 50, 200));
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;

  const result: SyncResult = {
    workspaceId,
    processed: 0,
    contactsUpserted: 0,
    threadsUpserted: 0,
    dealsUpserted: 0,
    embedded: 0,
    skipped: 0,
  };

  // load prior cursor (last seen thread_id set)
  const { data: state } = await admin
    .from("sync_state")
    .select("cursor")
    .eq("workspace_id", workspaceId)
    .eq("source", "instantly")
    .maybeSingle();
  const seen = new Set<string>(state?.cursor ? String(state.cursor).split(",").filter(Boolean) : []);

  const wsKey = await loadWorkspaceInstantlyKeyAdmin(workspaceId);
  if (!wsKey) {
    result.error = "Instantly is not connected for this workspace";
    return result;
  }
  let items: RawEmail[] = [];
  try {
    items = await fetchInstantly(wsKey, limit);

  } catch (err) {
    result.error = err instanceof Error ? err.message : "fetch failed";
    await admin.from("sync_state").upsert(
      {
        workspace_id: workspaceId,
        source: "instantly",
        last_run_at: new Date().toISOString(),
        last_error: result.error,
      },
      { onConflict: "workspace_id,source" },
    );
    return result;
  }

  const nextCursor = new Set<string>(seen);

  for (const e of items) {
    const emailId = e.thread_id ?? e.id;
    if (!emailId) continue;
    if (seen.has(emailId)) {
      result.skipped++;
      continue;
    }
    result.processed++;
    nextCursor.add(emailId);

    const fromJson = e.from_address_json?.[0];
    const fromEmail = (fromJson?.address ?? e.from_address_email ?? "").toLowerCase().trim();
    if (!fromEmail) continue;
    const fromName = fromJson?.name?.trim() || nameFromEmail(fromEmail);
    const company = companyFromEmail(fromEmail);
    const bodyText = e.body?.text ?? (e.body?.html ? stripHtml(e.body.html) : "");
    const subject = e.subject ?? "(no subject)";
    const receivedAt = e.timestamp_email ?? e.timestamp_created ?? new Date().toISOString();
    const { category, priority, confidence } = classify(subject, bodyText, e.ai_interest_value);

    // 1) contact upsert
    const { data: contact, error: contactErr } = await admin
      .from("contacts")
      .upsert(
        {
          workspace_id: workspaceId,
          email: fromEmail,
          name: fromName,
          company,
          source: "instantly",
          last_seen_at: receivedAt,
        },
        { onConflict: "workspace_id,email" },
      )
      .select("id")
      .maybeSingle();
    if (contactErr) continue;
    result.contactsUpserted++;

    // 2) thread upsert
    await admin.from("email_threads").upsert(
      {
        workspace_id: workspaceId,
        thread_id: emailId,
        contact_id: contact?.id ?? null,
        contact_email: fromEmail,
        subject,
        last_body: bodyText.slice(0, 4000),
        mailbox: e.eaccount ?? null,
        source: "instantly",
        category,
        priority,
        confidence,
        last_received_at: receivedAt,
        meta: { campaign_id: e.campaign_id ?? null, ai_interest_value: e.ai_interest_value ?? null },
      },
      { onConflict: "workspace_id,thread_id" },
    );
    result.threadsUpserted++;

    // 3) deal upsert
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
        source: "instantly",
        last_activity_at: receivedAt,
      },
      { onConflict: "workspace_id,thread_id" },
    );
    result.dealsUpserted++;

    // 4) timeline event
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
      meta: { source: "instantly" } as never,
    });

    // 5) lead score
    await admin.from("lead_scores").upsert(
      {
        workspace_id: workspaceId,
        lead_key: fromEmail,
        score: scoreFrom(priority, category),
        reason: `${category} • ${priority}`,
      },
      { onConflict: "workspace_id,lead_key" },
    );

    // 6) embedding (best-effort)
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
        result.embedded++;
      }
    }
  }

  // trim cursor (keep last 500 ids)
  const cursorArr = Array.from(nextCursor).slice(-500);
  await admin.from("sync_state").upsert(
    {
      workspace_id: workspaceId,
      source: "instantly",
      cursor: cursorArr.join(","),
      last_run_at: new Date().toISOString(),
      last_ok_at: new Date().toISOString(),
      last_error: null,
      stats: {
        processed: result.processed,
        embedded: result.embedded,
        skipped: result.skipped,
      },
    },
    { onConflict: "workspace_id,source" },
  );

  return result;
}

// ------------------ User-facing wrappers ------------------

async function assertOwnerOrAdmin(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  const role = data?.role as string | undefined;
  if (role !== "owner" && role !== "admin") throw new Error("Only workspace admins can trigger sync");
}

export const runSyncForMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ limit: z.number().int().min(10).max(200).optional() }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const wsId = await getCurrentWorkspaceId(
      context.supabase as unknown as SupabaseClient<Database>,
      context.userId,
    );
    if (!wsId) throw new Error("No workspace");
    await assertOwnerOrAdmin(context.supabase as unknown as SupabaseClient<Database>, wsId, context.userId);
    // Only run Instantly sync when this workspace has explicitly connected it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conn } = await (context.supabase as any)
      .from("workspace_integrations")
      .select("id")
      .eq("workspace_id", wsId)
      .eq("provider", "instantly")
      .eq("status", "connected")
      .maybeSingle();
    if (!conn) {
      return {
        workspaceId: wsId,
        processed: 0,
        contactsUpserted: 0,
        threadsUpserted: 0,
        dealsUpserted: 0,
        embedded: 0,
        skipped: 0,
        error: "Instantly is not connected for this workspace",
      };
    }
    return await runInstantlySync(wsId, { limit: data.limit });
  });

export type SyncStatusRow = {
  source: string;
  last_run_at: string | null;
  last_ok_at: string | null;
  last_error: string | null;
  stats: Record<string, number>;
};

export const getSyncStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ rows: SyncStatusRow[] }> => {
    const wsId = await getCurrentWorkspaceId(
      context.supabase as unknown as SupabaseClient<Database>,
      context.userId,
    );
    if (!wsId) return { rows: [] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (context.supabase as any)
      .from("sync_state")
      .select("source, last_run_at, last_ok_at, last_error, stats")
      .eq("workspace_id", wsId);
    return { rows: (data ?? []) as SyncStatusRow[] };
  });

export type DealRow = {
  id: string;
  thread_id: string | null;
  stage: string;
  category: string | null;
  priority: string | null;
  confidence: number | null;
  value_estimate: number | null;
  last_activity_at: string;
  contact_id: string | null;
};

export const listRecentDeals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ deals: DealRow[] }> => {
    const wsId = await getCurrentWorkspaceId(
      context.supabase as unknown as SupabaseClient<Database>,
      context.userId,
    );
    if (!wsId) return { deals: [] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (context.supabase as any)
      .from("deals")
      .select("id, thread_id, stage, category, priority, confidence, value_estimate, last_activity_at, contact_id")
      .eq("workspace_id", wsId)
      .order("last_activity_at", { ascending: false })
      .limit(50);
    return { deals: (data ?? []) as DealRow[] };
  });
