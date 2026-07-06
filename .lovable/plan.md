# Byteback Inbox AI — Phase 2 Audit & Rollout Plan

This is a very large scope (13 steps, 20+ integrations, AI overhaul, pipelines, notifications, mobile). I can't ship all of it in one turn without producing shallow, broken work. Below is an honest audit of what exists today, then a phased plan. **Pick which phase you want first and I'll build it end-to-end.**

---

## Step 1 — Product Audit (current state)

### Done
- Auth (email + Google), onboarding, workspaces + members + roles
- Tasks table + list, notifications table + bell
- Lead scores table, basic AI functions (`src/lib/ai.functions.ts`)
- Instantly.ai integration (server fn)
- Email accounts table (schema only)

### Partial
- **AI summary / classification** — exists but keyword-ish, no confidence, no reason, no next-action
- **Notifications** — table + bell UI, no push/browser/email/Slack delivery, no snooze/pin/assign
- **Follow-up engine** — tasks exist, no "when to follow up?" prompt on status change, no escalation
- **Pipelines / lead status** — hardcoded, not user-configurable, no drag-and-drop
- **Email accounts** — table exists, no OAuth connect flow, no sync
- **Clickability** — several cards/avatars/stat tiles are decorative

### Missing
- Native OAuth to Gmail / Google Workspace / Microsoft 365 / Outlook / IMAP / SMTP
- CRM integrations: HubSpot, Zoho, Salesforce, Pipedrive, Freshsales, Close
- Outreach: Smartlead, Apollo, Lemlist, Saleshandy
- Comms: Slack, Teams, Google Calendar, Meet, Zoom
- Automation: Zapier, Make, generic webhook API
- AI Timeline per lead + "Why is this lead Hot?" explainability
- Smart escalation (30m / 2h / 24h no-reply)
- Custom pipelines (unlimited stages, colors, icons, drag/drop, multiple boards)
- Custom lead statuses with color/icon/automation
- Notification delivery channels (push, browser, desktop, email, Slack, Teams, Telegram)
- Mobile PWA + offline + native push
- Universal 2-click UX pass, a11y pass

---

## Reality check on integrations

Each OAuth integration = provider app registration + secrets + callback route + token storage + refresh + sync workers + UI. **A single one (e.g. Gmail) is a multi-hour build.** 20+ of them in one turn is not feasible and would ship broken.

Realistic path: build the **integration framework once** (OAuth connector shell, token vault, sync worker, webhook receiver), then light up providers one at a time. Gmail + Outlook + Slack + HubSpot cover ~80% of demand — start there.

---

## Proposed phased rollout

**Phase 2A — AI & Lead Intelligence (highest user-visible value, no external deps)**
- Rewrite classification with Lovable AI (Gemini) using structured JSON: `category`, `confidence`, `reason`, `next_action`
- 22 categories from your list, 11 next-actions
- Per-lead **AI Timeline** table + UI (events: received, classified, assigned, reminded, escalated, replied…)
- **"Why is this lead Hot?"** explainability panel
- Accept / Reject on every AI suggestion (feedback loop stored)

**Phase 2B — Follow-up & Notification Engine**
- Status-change modal: "When would you like to follow up?" (Today / Tomorrow / Next week / Custom / None)
- Auto-create task + notification + scheduled reminder
- Escalation cron (30m / 2h / 24h) via pg_cron → `/api/public/hooks/escalate`
- Notification Center: mark read, archive, pin, snooze, assign
- Browser push (Web Push API) + email (Resend, already connected)

**Phase 2C — Custom Pipelines & Statuses**
- `pipelines`, `pipeline_stages`, `lead_statuses` tables
- Drag-and-drop board (dnd-kit), color + icon per stage/status
- Multiple saved pipelines per workspace
- Per-status automation hooks (calls into follow-up engine)

**Phase 2D — Clickability & UX pass**
- Audit every page, wire up every stat card / avatar / menu / icon
- 2-click max for common actions, keyboard shortcuts, a11y pass

**Phase 2E — Integration Framework + first providers**
- Generic OAuth connector table + token vault (encrypted)
- Gmail sync (read + send), Outlook sync, Slack notify, HubSpot contact sync
- Webhook API + Zapier/Make triggers

**Phase 2F — Additional providers** (Salesforce, Pipedrive, Zoho, Freshsales, Close, Smartlead, Apollo, Lemlist, Saleshandy, Teams, Calendar, Meet, Zoom, IMAP/SMTP) — one per turn

**Phase 2G — Mobile PWA** — installable, offline shell, native push

---

## What I need from you

Reply with which phase to build first — recommended order is **2A → 2B → 2C → 2D → 2E → 2F → 2G**. I'll implement the chosen phase completely (schema + server fns + UI + wiring + verification) in the next turn, then move to the next.

If you'd rather I just start, I'll begin with **Phase 2A (AI & Lead Intelligence)** since it delivers the biggest visible upgrade and unblocks the follow-up engine.
