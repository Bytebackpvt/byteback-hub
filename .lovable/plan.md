# What's left to build

Phases 2A (AI & Lead Intelligence) and 2B (Follow-up & Notification Engine) are shipped, plus recent auth-hardening (bearer refresh/retry, MISSING_AUTH_HEADER logging + tests) and the Help Center / guided tour. Everything below is still open.

---

## Phase 2C — Custom Pipelines & Statuses
- Schema: `pipelines`, `pipeline_stages`, `lead_statuses` (workspace-scoped, RLS + GRANTs)
- Drag-and-drop Kanban board (dnd-kit), color + icon per stage/status
- Multiple saved pipelines per workspace, switcher in `/app/pipeline`
- Per-status automation hooks that call into the follow-up engine (auto-task, auto-notify, escalation timer)
- Migration to move today's hardcoded stages into the new tables

## Phase 2D — Clickability & UX pass
- Audit every page; wire up stat cards, avatars, menus, empty-state CTAs (nothing decorative)
- 2-click max for common actions, keyboard shortcuts, focus states
- A11y pass: labels, roles, contrast, reduced-motion

## Phase 2E — Integration Framework + first providers
- Generic OAuth connector table + encrypted token vault + refresh worker
- Public callback route under `/api/public/oauth/*`
- Providers to light up first: Gmail (read+send), Outlook, Slack notify, HubSpot contact sync
- Generic inbound webhook API + Zapier / Make outbound triggers

## Phase 2F — Additional providers (one per turn)
Salesforce, Pipedrive, Zoho, Freshsales, Close, Smartlead, Apollo, Lemlist, Saleshandy, Teams, Google Calendar, Meet, Zoom, IMAP/SMTP.

## Phase 2G — Mobile PWA
- Installable manifest + service worker + offline shell (banner already exists)
- Web Push wired end-to-end on mobile
- Capacitor native push path for the iOS/Android shells already in the repo

---

## Smaller polish items still open
- Delivery channels beyond in-app + email: browser push toggle in prefs, Slack/Teams/Telegram
- "Accept / Reject" feedback loop UI on every AI suggestion (schema likely partial)
- Help Center: expand FAQs, add searchable content, keep manual PDF in sync
- Guided tour: cover Pipeline, Analytics, Integrations, Help pages

---

## Recommended next step
Build **Phase 2C (Custom Pipelines & Statuses)** next — it unlocks per-status automations that Phase 2B already expects, and it's fully internal (no external OAuth).

Reply with the phase you want, or say "start" and I'll pick up 2C.
