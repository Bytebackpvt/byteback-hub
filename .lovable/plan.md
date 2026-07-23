# Redesign: Inbox-First, Never Miss an Email

Shift the product from a multi-section CRM into a single Unified Inbox where AI does the classification, reply tracking, and follow-up nudging automatically. Model: Superhuman / Missive / Spark, not HubSpot.

## 1. Navigation & Shell (simplify)
Collapse the sidebar to just four destinations:
- **Inbox** (home — the product)
- **Stages** (kanban of conversations by stage)
- **Integrations** (mailboxes + notification channels)
- **Settings** (workspace, custom stages/temperatures, notification prefs, team)

Remove/hide from primary nav: Dashboard-as-index, CRM, Pipeline (folds into Stages), Radar, Tasks (folds into follow-ups), Analytics, Memory, Search (keep ⌘K palette), Sync Status (moved into Integrations detail), Notifications page (bell only), Help.

`/app` route redirects to `/app/inbox`. Header keeps ⌘K, bell, tour.

## 2. Unified Inbox (the homepage)
Single dense list combining every connected source. Each row shows in one line:
Sender · Company · Subject · Preview · Mailbox pill · Time · Temperature dot · Stage pill · Reply-status pill · Assignee avatar · Follow-up chip.

Row expansion shows: full AI summary (intent, urgency, next action, risks, suggested reply), thread history, quick actions (Reply, Snooze, Change stage/temp, Assign, Mark done).

Filters (chips, not menus): All · Waiting reply · Hot · Follow-up due · Unassigned · Mailbox:*
Sort: latest activity first (already implemented — keep).

## 3. AI Auto-Detection
Extend `classify.functions.ts` to output on every ingested message:
- **Temperature**: hot / warm / cold / lost / spam
- **Stage** (default taxonomy): new_lead, interested, need_pricing, demo_requested, inspection_requested, pickup_requested, rental_inquiry, amc_inquiry, itad_inquiry, refurb_laptop_inquiry, waiting_customer, followup_required, won, lost, closed
- **Priority**: p0/p1/p2
- **Suggested reply** (short)

Store on `email_threads` (extend columns). Manual override always wins (audit-logged — already exists).

**Custom stages/temperatures**: new tables `workspace_stages`, `workspace_temperatures` (name, color, order, is_default). Settings UI to CRUD. Classifier receives the workspace's active taxonomy in its prompt.

## 4. Reply Detection Engine
For every inbound thread, compute reply-status by joining inbound + sent rows on `gmail_thread_id` / `in_reply_to` / normalized subject+participants:
- `waiting_reply` — inbound newer than last outbound
- `replied` — outbound newer than last inbound
- `customer_replied_again` — inbound newer than outbound, and prior outbound exists
- `pending_followup` — replied, but customer hasn't answered within threshold
- `closed` — stage in (won/lost/closed)

Compute in a SQL view or in `sync.functions.ts` after ingest; persist on `email_threads.reply_status` + `last_outbound_at` / `last_inbound_at`. UI shows chips: "Replied 3m ago", "No reply yet", "Customer replied again".

## 5. Follow-up Engine
Per-workspace config: reminder ladder (15m, 30m, 1h, 4h, 24h, 48h — toggleable).
Cron (`cron.escalate.ts` — extend) scans threads where `reply_status='waiting_reply'` and `last_inbound_at` older than next ladder step → emits notification (in-app + push + email + Slack webhook if configured) and stamps `followup_notified_at`.

Fold existing Tasks system into this — no separate Tasks page.

## 6. Notifications (push mandatory)
Web Push already scaffolded (`push.ts`, `sw.js`). Add server-side dispatch in the escalate/scan flow for: new_lead, hot_lead, warm_lead, customer_reply, no_reply_sent, followup_due, mailbox_disconnected, sync_failed, oauth_expiring. Reuse `notifications` table + `deliverToWebhooks` for Slack. Bell shows in-app feed.

## 7. Sent Tracking (already partly done)
Keep the Gmail SENT backfill. Add same for Instantly (already sent-aware). For IMAP/Outlook (future providers), require SENT folder selection at connect time. Surface "Last reply by <user> · 3m ago" on every row.

## 8. Better AI Summary
Rewrite `assistant.functions.ts` / `ai.functions.ts` summarizer to take the **full thread** (all messages, chronological), not just latest. Output structured JSON: `{ intent, service_requested, urgency, next_action, risks, suggested_reply }`. Cache in `ai_insights_cache` keyed by thread + message count.

## 9. Stages View
Kanban replacement for `/app/pipeline` and `/app/crm` — one board, columns = workspace stages, cards = threads. Drag to change stage (writes audit). This is the only "CRM-ish" surface and it's optional.

## 10. Cleanup
Delete or hide routes: `app.crm`, `app.pipeline` (replaced by `app.stages`), `app.radar`, `app.tasks`, `app.memory`, `app.analytics` (move a mini KPI strip into Inbox header), `app.notifications` (bell only), `app.help`, `app.search` (⌘K only), `app.sync-status` (into Integrations).

## Technical Details

**Schema migration:**
- `email_threads`: add `temperature`, `stage`, `priority`, `reply_status`, `last_inbound_at`, `last_outbound_at`, `followup_notified_at`, `assigned_user_id`, `suggested_reply`.
- New `workspace_stages` (id, workspace_id, key, label, color, sort, is_system).
- New `workspace_temperatures` (same shape).
- New `workspace_followup_config` (ladder JSONB, channels JSONB).
- Backfill defaults on migration; RLS + GRANTs per project rules.

**Server functions to add/extend:**
- `computeReplyStatus(threadId)` — invoked post-ingest.
- `dispatchFollowups()` — cron.
- `dispatchPush(userId, payload)` — Web Push over VAPID (extend `push.ts`).
- `stages.functions.ts` / `temperatures.functions.ts` — CRUD.
- `classify.functions.ts` — richer output.
- `assistant.functions.ts` — full-thread summarizer.

**Routes:**
- `/app` → redirect `/app/inbox`.
- New: `/app/stages`, `/app/settings/stages`, `/app/settings/followups`.
- Removed from nav (files kept behind ⌘K until confirmed).

**Order of shipping (I'll do these in sequence, one turn each unless small):**
1. Schema migration (stages, temperatures, thread columns, followup config).
2. Extend classifier + summarizer; backfill on new syncs.
3. Reply-status computation + UI chips.
4. Inbox row redesign with all pills + expansion panel.
5. Follow-up cron + web push dispatch.
6. Stages kanban replacing pipeline/crm.
7. Sidebar slim-down + route cleanup + settings pages.

## Out of scope for this pass
- Microsoft 365 / Outlook / generic IMAP connectors (registry exists, adapters are separate work — call out at the end).
- Native Android/iOS push (web push covers PWA install on both; native shell is Capacitor and already wired).
- Slack/Teams native apps (webhook delivery already covers Slack; Teams later).

Approve and I'll start with step 1 (schema).
