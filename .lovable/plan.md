# Phase 3 Build Plan — ByteBack AI Sales Command Center

Scope is huge — shipping in **3 sequential milestones** (approx 1 week each). Each milestone leaves the app in a sellable, working state. Audit-fixes are folded into whatever milestone touches that surface.

---

## Milestone 1 — Integration Marketplace (Catalog + Real Google/Webhook)

**Goal:** `/app/integrations/marketplace` looks like Stripe/Linear/Notion. Every provider you listed is *visible*, but only Google Workspace + Webhook actually connect. Every other card = "Request early access" (adds row to `integration_requests` — real waitlist, not fake).

### New pages
1. **`/app/integrations/marketplace`** — Search bar, category sidebar (Email, Cold Email, CRM, Chat, Calendar, Storage, AI, Automation), grid of provider cards. Each card: logo, name, tagline, category, status pill.
2. **`/app/integrations/marketplace/$providerId`** — Detail drawer: description, permissions, "Connect" (OAuth) or "Join waitlist" button, docs link.
3. **`/app/integrations/connected`** — "Connected Accounts" dashboard. Grouped by provider. Per-connection: health dot (green/yellow/red), last sync, mailbox count, sync status, errors, Reconnect/Disconnect buttons.

### Backend
- New table `integration_catalog` (seeded via migration): id, name, category, logo_url, tagline, oauth_supported, status ('live'|'beta'|'coming_soon'), auth_type.
- New table `integration_requests`: workspace_id, user_id, provider_id, created_at (dedup on workspace+provider).
- Extend `oauth_connections` view: last_sync_at, last_error, health_status, mailbox_count.
- Server fns: `listCatalog`, `listConnected`, `requestIntegration`, `reconnectIntegration`, `disconnectIntegration`, `getConnectionHealth`.

### Real integrations wired in this milestone
- **Google Workspace / Gmail** — reuse existing OAuth flow.
- **Instantly.ai** — already connected via API key; surface as "Connected" card.
- **Webhook / REST** — generate per-workspace webhook URL + signing secret (`generate_secret`).

### Audit fixes folded in
- Sidebar "Integrations" link points to new marketplace.
- Remove/repurpose stale "coming soon" chips on old integrations page.
- Fix onboarding invite email flow (verify `workspace_invites` accept path works end-to-end).

---

## Milestone 2 — AI Follow-up Engine + Notification Center

**Goal:** No hot lead ever forgotten. Full loop: mark lead → schedule reminder → notify across channels → auto-escalate.

### Flow
1. On any lead classification change (Hot/Warm/Cold/Won/Lost/Hold) → modal appears: "When should I remind you?" with quick options (30m, 1h, 2h, Tomorrow 9am, Next Week, Custom, No reminder).
2. Creates row in `tasks` (already exists) + `notifications` row + schedules delivery.
3. Delivery workers: browser push (web-push), in-app toast, email (Resend — key present), Slack DM (only if Slack connected — otherwise skipped, not fake).
4. **Auto-escalation cron** (`pg_cron` every 10 min, calling `/api/public/hooks/escalate`): if reminder ignored past due time, priority bumped, second notification fires.

### Notification Center redesign (`/app/notifications`)
- Categorized tabs: New Reply, Hot Lead, Demo, Pricing, Pickup, Meeting, Reminder, Follow-up, System, Integration Error.
- Per-item quick actions: Open Lead, Reply, Assign, Snooze (30m/1h/tomorrow), Archive, Complete.
- Unread count in sidebar badge (real, not mock).

### Backend
- New table `reminders`: task_id, lead_id, workspace_id, due_at, channels (jsonb), status, escalation_level.
- New table `push_subscriptions` (browser push endpoint + keys per user).
- Extend `notifications` with `category`, `snoozed_until`, `action_url`.
- Server fns: `scheduleReminder`, `snoozeNotification`, `dispatchReminder` (server-side), `subscribePush`.
- pg_cron job: escalate overdue reminders every 10 min.

### Audit fixes folded in
- Dashboard priority action rows (Task/Reply/Followup) → wire to real tasks/notifications data instead of mock counts.
- Tasks page: complete `onSuccess` UX already partial (undo toast).

---

## Milestone 3 — AI Opportunity Radar + Universal Search + AI Memory (pgvector)

**Goal:** The "AI Sales Command Center" USP. One-line summary at top of dashboard: *"You have 3 Hot Leads unreplied 2h+, potential ₹18.5L."*

### Opportunity Radar (`/app/radar` + dashboard hero card)
- Cron every 10 min scans all connected mailboxes (via Instantly API + Gmail sync).
- Categorizes new/unactioned emails into: Hot unreplied, Warm, Demo request, Pricing request, Pickup, Meeting-to-schedule, Follow-up overdue, Lost opportunity.
- Each row: contact, company, subject, waited time, AI-estimated value, action buttons (Reply, Snooze, Assign).
- Dashboard hero summary sentence generated from aggregate.

### AI Sync Engine (per-email pipeline)
Triggered on new email webhook / Instantly poll:
1. Fetch → 2. AI classify (Lovable AI Gateway, `google/gemini-3-flash-preview`) → 3. Extract summary/intent/sentiment/buying-intent/urgency/customer-value/lead-temp/suggested-reply/next-action/risk/close-probability → 4. Upsert `contacts` + `companies` + `deals` + `timeline_events` → 5. Create `notification` if Hot/Demo/Pricing → 6. Create follow-up task → 7. Store embedding in pgvector for memory.

### AI Memory (pgvector)
- Enable `pgvector` extension.
- New table `email_embeddings`: id, workspace_id, contact_id, email_id, content, embedding vector(3072), metadata jsonb, created_at. HNSW halfvec index.
- Embed via `google/gemini-embedding-001` on every synced email.
- `match_context(contact_id, query_embedding, k)` SQL function.
- When AI drafts a reply or radar summary, pull top-5 relevant past emails as context. Enables prompts like *"customer asked pricing 17 days ago and requested demo yesterday"* — computed from real embeddings + metadata.

### Universal Search (`Cmd+K` global + `/app/search`)
- One search bar. Backend: parallel query across `emails`, `contacts`, `companies`, `deals`, `tasks`, `notifications` (Postgres FTS) + semantic search over `email_embeddings` (pgvector).
- Natural language queries mapped to filters via LLM: "Show all Hot Leads", "leads waiting >48h reply", "GreenSpark leads" → structured filter → results.
- Result groups by entity type.

### Universal AI Inbox (`/app/inbox`)
- Merges Gmail + Instantly emails into single view. Columns: Company, Person, Subject, Priority, AI Classification, Mailbox, Platform badge, Assigned User.
- Filters, bulk actions, keyboard shortcuts (j/k/e/r like Superhuman).

### Product Intelligence Dashboard (`/app/analytics/health`)
- Missed leads, avg reply time, lost opps, fastest/slowest responder, best/worst campaign, mailbox health.
- One AI-generated insight card at top: *"You missed 4 Hot Leads this week."*

---

## Cross-cutting audit pass (executed inline in above milestones)

Every touched surface gets these checks:
- Every button either works or is removed (no dead affordances).
- Every list clicks through to a real detail page.
- Empty states have real CTAs.
- Loading + error + not-found states for every route with a loader.
- Sign-up → workspace create → invite teammate → connect first integration flow works end-to-end.

Anything found that isn't in a milestone above gets logged for Phase 4 rather than half-fixed.

---

## Technical section

**Stack decisions:**
- All AI via Lovable AI Gateway (`google/gemini-3-flash-preview` for chat, `google/gemini-embedding-001` for embeddings, 3072-dim `vector` column with halfvec HNSW index).
- Every server fn touching AI or external APIs uses `requireSupabaseAuth` (fixes security memory open findings simultaneously).
- Cron endpoints under `/api/public/hooks/*` with HMAC verification.
- Browser push via VAPID keys (`generate_secret` VAPID_PRIVATE_KEY).
- All new tables: RLS enabled, GRANT to authenticated + service_role, workspace_id scoping via `has_role`/workspace membership.
- Realtime channels for notifications + radar updates.

**New Supabase tables (rough):**
```text
integration_catalog       (seed data, public read)
integration_requests      (waitlist)
reminders                 (scheduled + escalation)
push_subscriptions        (per-user endpoints)
email_embeddings          (pgvector 3072)
timeline_events           (unified activity log)
ai_insights_cache         (radar snapshots, refreshed by cron)
```

**Cron jobs (pg_cron + pg_net):**
- `radar-scan` every 10 min → `/api/public/hooks/radar-scan`
- `reminder-dispatch` every 1 min → `/api/public/hooks/dispatch-reminders`
- `reminder-escalate` every 10 min → `/api/public/hooks/escalate`
- `instantly-sync` every 5 min → `/api/public/hooks/instantly-sync`

**Secrets needed (auto or generated, no user input for these):**
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (generate_secret)
- `WEBHOOK_SIGNING_SECRET` (generate_secret)
- Existing: LOVABLE_API_KEY, INSTANTLY_API_KEY, RESEND_API_KEY ✓

**Milestone size estimate:**
- M1: ~15 files, 2 migrations, 1 cron
- M2: ~20 files, 3 migrations, 2 crons, push infra
- M3: ~30 files, 4 migrations (incl. pgvector), 2 crons, embedding pipeline, radar UI, search UI, memory RAG

---

## Confirm before I start

Reply **"start M1"** to begin Milestone 1 (Marketplace). Or say which milestone to start with — they're independent enough that I can do them in any order, but M1 gives the most immediate "wow" for demos.
