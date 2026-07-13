## Goal

Make the integrations flow **universal** — same connect / configure / disconnect / sync UX for every provider — and start closing the remaining product gaps (invites, digest emails, analytics, notifications settings).

---

## Part 1 — Universal Integrations Flow

Right now Instantly and Gmail each have their own custom UI + server code. Everything else in the marketplace is just a "Request" button. Make one generic pattern that all providers plug into.

### 1.1 Provider registry (single source of truth)

Create `src/lib/integrations/registry.ts` — one entry per provider with:
- `id`, `name`, `logo_slug`, `category`
- `auth_kind`: `"oauth"` | `"api_key"` | `"webhook_in"` | `"webhook_out"`
- `fields`: schema of what the user must enter (label, type, placeholder, secret y/n)
- `capabilities`: `["ingest_email", "send_email", "crm_sync", "notify", "sheets"]`
- `test_fn`: server function name to validate credentials
- `sync_fn` (optional): server function to pull data

Providers to seed: Gmail, Outlook, Instantly, Smartlead, Apollo, HubSpot, Salesforce, Pipedrive, Slack, Teams, Discord, Zapier, Google Sheets, generic webhook.

### 1.2 One generic table row shape

`workspace_integrations` already stores `provider`, `config`, `secret`, `status`. Keep it — just make sure every new provider writes here (no more per-provider tables).

### 1.3 Universal server functions

Replace the scattered per-provider fns with:
- `connectIntegration({ provider, fields })` — validates via registry, encrypts secret, upserts row.
- `testIntegration({ id })` — calls the provider's `test_fn`.
- `syncIntegration({ id })` — calls the provider's `sync_fn` if it has one.
- `disconnectIntegration({ id })` — deletes row + revokes tokens where possible.

Existing Gmail / Instantly code becomes just two of the registry entries; their internals stay, but the UI calls the universal fns.

### 1.4 Universal UI

Replace the current marketplace + Instantly-specific screens with:
- **`/app/integrations`** — grid of all providers from registry. Each card shows status (Not connected / Connected / Error) and Connect / Manage button.
- **`/app/integrations/$providerId`** — renders a generic form from `fields`; OAuth providers show "Connect with X" button; API-key providers show input fields; webhook-in providers show the generated inbound URL to paste elsewhere. Same page also shows Test, Sync now, Disconnect.
- **`/app/integrations/connected`** — filtered view of connected only.

All rendering is data-driven from the registry — adding a new provider = one registry entry + optional test/sync fn, zero UI code.

### 1.5 Data pipeline hooks

Wire capabilities so the rest of the app reacts:
- `ingest_email` capability → thread listing merges from all such integrations for the workspace (already works for Gmail/Instantly — generalize the merge).
- `notify` capability → notification dispatcher fans out to every connected notifier (Slack, Teams, Discord, webhook).
- `crm_sync` capability → contact/deal syncers pick up connected CRMs.

---

## Part 2 — Remaining product work

### 2.1 Team invites (accept flow)
- Public route `/invite/$token` that reads `workspace_invites`, prompts sign-in / sign-up, then joins the workspace (`workspace_members` insert) and marks invite accepted.
- Send invite email via Lovable Emails using existing auth-email infra.

### 2.2 Notifications settings UI polish
- `notification_preferences` table already exists — the settings page needs per-channel toggles (in-app, email, Slack, digest) tied to real prefs.
- Respect prefs in the notification dispatcher.

### 2.3 Daily digest email
- `cron.daily-digest` route exists; wire it to real per-user digest content (new replies, hot leads, pending tasks) using Lovable Emails.
- Add unsubscribe link → toggles `notification_preferences.digest_email`.

### 2.4 Analytics
- Replace mock numbers with real queries: reply rate over time, response time, hot-lead conversion, per-account performance.
- Add date-range filter.

### 2.5 Small polish
- Sidebar badges already dynamic — add unread notifications count too.
- Empty states across Inbox / Pipeline / Radar link into the right integration to fix.

---

## Suggested order of delivery

1. Provider registry + universal server fns + universal UI (Part 1.1 – 1.4). Instantly and Gmail migrate onto it.
2. Capability wiring (Part 1.5).
3. Invite accept flow (2.1).
4. Digest email + notification prefs (2.3 + 2.2).
5. Analytics (2.4).
6. Polish (2.5).

## What I need from you

- Confirm the order above works, ya kisi ek cheez ko pehle chahiye (invites / digest / analytics)?
- Kya main abhi step 1 (universal integrations) se shuru kar du?
