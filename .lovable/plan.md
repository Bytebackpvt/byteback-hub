# What's left to build

Phases 2A (AI & Lead Intelligence) and 2B (Follow-up & Notification Engine) are shipped, plus recent auth-hardening (bearer refresh/retry, MISSING_AUTH_HEADER logging + tests) and the Help Center / guided tour. Everything below is still open.

---

## Phase 2C — Custom Pipelines & Statuses
- [x] Schema: `pipeline_stages` with workspace scope, RLS + GRANTs (already shipped)
- [x] Drag-and-drop Kanban board (dnd-kit-style), color + won/lost markers
- [x] **Icons per stage** (11-icon picker: inbox, flame, calendar, trophy, star, flag, check, bell, zap, x, circle)
- [x] **Per-stage automation** (`automation` jsonb): auto-create follow-up task (days offset, priority, `{name}`/`{company}` templates) and/or in-app notification
- [x] Automation fires from `updateLeadStatus` via new `runStageAutomation` server fn (RLS-scoped, best-effort)
- [ ] Multiple saved pipelines per workspace + switcher (not shipped — separate refactor)


## Phase 2D — Clickability & UX pass (in progress)
- [x] Mobile viewport: `100vh`/`min-h-screen` → `dvh` across shell, auth, onboarding, root, index, inbox, crm, pipeline, tasks, analytics
- [x] Guided tour a11y: dialog role, focus-on-open, Escape/←/→ keys, labeled backdrop `<button>`s
- [x] Empty-state CTAs: dashboard (briefing/hot/tasks), inbox (clear filters), crm (clear search), tasks (add + generate)
- [x] Clickable dashboard hot-reply rows with descriptive aria-labels
- [x] Analytics "Connect Instantly" CTA link when disconnected
- [x] Global `?` keyboard-shortcuts overlay (inputs excluded)
- [x] Reduced-motion global CSS + focus-visible outline
- [x] Integrations & Help: semantic list/region, FAQ aria-controls/aria-expanded, focus rings
- [ ] Pipeline, Analytics — deeper interaction/a11y pass
- [ ] Contrast sweep (audit remaining muted-foreground/50 usages)



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
