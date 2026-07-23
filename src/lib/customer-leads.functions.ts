/**
 * Customer-Lead engine.
 *
 * A Lead groups every email thread from the same customer email address into
 * one entity regardless of which internal mailbox is currently talking to
 * them. It is the anchor for follow-up notifications and auto-close.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getCurrentWorkspaceId } from "@/lib/workspace.functions";

export type CustomerLead = {
  id: string;
  customerEmail: string;
  customerName: string | null;
  customerDomain: string | null;
  status: "open" | "snoozed" | "won" | "lost" | "dead";
  temperature: string | null;
  stage: string | null;
  ownerMailbox: string | null;
  firstContactAt: string | null;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  lastActivityAt: string;
  nextFollowupAt: string | null;
  snoozedUntil: string | null;
  threadCount: number;
  needsAttention: boolean;
  waitingHours: number | null;
};

async function ws(supabase: SupabaseClient<Database>, userId: string): Promise<string | null> {
  return (await getCurrentWorkspaceId(supabase, userId)) ?? null;
}

function hoursSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 36e5));
}

function mapLead(r: Record<string, unknown>): CustomerLead {
  const lastIn = (r.last_inbound_at as string | null) ?? null;
  const lastOut = (r.last_outbound_at as string | null) ?? null;
  const status = (r.status as CustomerLead["status"]) ?? "open";
  // needs_attention: customer replied after us OR we never replied
  const needsAttention =
    status === "open" &&
    !!lastIn &&
    (!lastOut || new Date(lastIn) > new Date(lastOut));
  return {
    id: String(r.id),
    customerEmail: String(r.customer_email),
    customerName: (r.customer_name as string | null) ?? null,
    customerDomain: (r.customer_domain as string | null) ?? null,
    status,
    temperature: (r.temperature as string | null) ?? null,
    stage: (r.stage as string | null) ?? null,
    ownerMailbox: (r.owner_mailbox as string | null) ?? null,
    firstContactAt: (r.first_contact_at as string | null) ?? null,
    lastInboundAt: lastIn,
    lastOutboundAt: lastOut,
    lastActivityAt: String(r.last_activity_at),
    nextFollowupAt: (r.next_followup_at as string | null) ?? null,
    snoozedUntil: (r.snoozed_until as string | null) ?? null,
    threadCount: Number(r.thread_count ?? 0),
    needsAttention,
    waitingHours: needsAttention ? hoursSince(lastIn) : null,
  };
}

const ListInput = z
  .object({
    filter: z.enum(["all", "needs_attention", "open", "snoozed", "closed"]).default("needs_attention"),
    limit: z.number().int().min(1).max(500).default(200),
  })
  .default({ filter: "needs_attention", limit: 200 });

export const listCustomerLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ListInput.parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const workspaceId = await ws(context.supabase, context.userId);
    if (!workspaceId) return { leads: [] as CustomerLead[] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = (context.supabase as any)
      .from("leads")
      .select(
        "id, customer_email, customer_name, customer_domain, status, temperature, stage, owner_mailbox, first_contact_at, last_inbound_at, last_outbound_at, last_activity_at, next_followup_at, snoozed_until, thread_count",
      )
      .eq("workspace_id", workspaceId)
      .order("last_activity_at", { ascending: false })
      .limit(data.limit);

    if (data.filter === "open") q = q.eq("status", "open");
    else if (data.filter === "snoozed") q = q.eq("status", "snoozed");
    else if (data.filter === "closed") q = q.in("status", ["won", "lost", "dead"]);
    // needs_attention filtered client-side after mapping

    const { data: rows, error } = await q;
    if (error) throw error;
    const all = ((rows as Record<string, unknown>[]) ?? []).map(mapLead);
    const filtered =
      data.filter === "needs_attention" ? all.filter((l) => l.needsAttention) : all;
    return { leads: filtered };
  });

const GetInput = z.object({ leadId: z.string().uuid() });

export const getCustomerLead = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => GetInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await ws(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace");
    const { data: lead, error } = await context.supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("leads" as any)
      .select("*")
      .eq("id", data.leadId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw error;
    if (!lead) throw new Error("Lead not found");

    const { data: threads } = await context.supabase
      .from("email_threads")
      .select("id, thread_id, subject, mailbox, source, last_received_at, meta, temperature, stage, reply_status")
      .eq("workspace_id", workspaceId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq("lead_id" as any, data.leadId)
      .order("last_received_at", { ascending: false })
      .limit(200);

    return {
      lead: mapLead(lead as unknown as Record<string, unknown>),
      threads: threads ?? [],
    };
  });

const UpdateInput = z.object({
  leadId: z.string().uuid(),
  status: z.enum(["open", "snoozed", "won", "lost", "dead"]).optional(),
  temperature: z.string().max(40).nullable().optional(),
  stage: z.string().max(40).nullable().optional(),
  snoozedUntil: z.string().datetime().nullable().optional(),
});

export const updateCustomerLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => UpdateInput.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await ws(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace");
    const patch: Record<string, unknown> = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.temperature !== undefined) patch.temperature = data.temperature;
    if (data.stage !== undefined) patch.stage = data.stage;
    if (data.snoozedUntil !== undefined) {
      patch.snoozed_until = data.snoozedUntil;
      if (data.snoozedUntil) patch.status = "snoozed";
    }
    if (Object.keys(patch).length === 0) return { ok: true as const };
    const { error } = await context.supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("leads" as any)
      .update(patch)
      .eq("id", data.leadId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return { ok: true as const };
  });

export type LeadDashboardBucket = {
  needsAttention: CustomerLead[];
  waitingReply: CustomerLead[];
  followupDue: CustomerLead[];
  totals: { open: number; snoozed: number; closed: number };
};

export const getLeadDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LeadDashboardBucket> => {
    const workspaceId = await ws(context.supabase, context.userId);
    const empty: LeadDashboardBucket = {
      needsAttention: [],
      waitingReply: [],
      followupDue: [],
      totals: { open: 0, snoozed: 0, closed: 0 },
    };
    if (!workspaceId) return empty;

    const { data: rows, error } = await context.supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("leads" as any)
      .select(
        "id, customer_email, customer_name, customer_domain, status, temperature, stage, owner_mailbox, first_contact_at, last_inbound_at, last_outbound_at, last_activity_at, next_followup_at, snoozed_until, thread_count",
      )
      .eq("workspace_id", workspaceId)
      .limit(1000);
    if (error) throw error;
    const all = ((rows as unknown as Record<string, unknown>[]) ?? []).map(mapLead);

    const now = Date.now();
    return {
      needsAttention: all.filter((l) => l.needsAttention).slice(0, 25),
      waitingReply: all
        .filter(
          (l) =>
            l.status === "open" &&
            l.lastOutboundAt &&
            (!l.lastInboundAt || new Date(l.lastOutboundAt) > new Date(l.lastInboundAt)),
        )
        .slice(0, 25),
      followupDue: all
        .filter(
          (l) => l.status === "open" && l.nextFollowupAt && new Date(l.nextFollowupAt).getTime() <= now,
        )
        .slice(0, 25),
      totals: {
        open: all.filter((l) => l.status === "open").length,
        snoozed: all.filter((l) => l.status === "snoozed").length,
        closed: all.filter((l) => l.status === "won" || l.status === "lost" || l.status === "dead").length,
      },
    };
  });
