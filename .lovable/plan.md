
## Goal
Make ByteBack minimalist and focused. Remove clutter, fix AI quality, and make the core loop (connect email → unibox → auto-detect hot/warm/cold → move through stages) work correctly.

## 1. Navigation — remove clutter
Keep only these in sidebar:
- **Dashboard** (with Priority Tasks + Opportunity Radar inside)
- **Unibox** (renamed from Inbox — shows both sent + received from all connected mailboxes)
- **Stages** (renamed from Pipeline — simple Kanban: New → Contacted → Hot → Negotiation → Won / Lost)
- **Integrations** (email connect)
- **Settings**

Remove from sidebar & routes:
- Contacts / CRM (merge lead status into Unibox thread header)
- Tasks (surface only inside Dashboard → Priority Tasks card)
- Analytics
- Radar as a separate page (merge into Dashboard)
- Notifications page (bell dropdown stays)
- Memory, Team-as-separate, Search page (⌘K palette stays)

## 2. Unibox fixes
- Sync **sent items too** (Gmail: add `in:sent` to the query, merge with inbox).
- Thread view shows the full back-and-forth (inbound + outbound messages in order).
- Hot/Warm/Cold pill + Stage pill stay in the thread header (already added).
- Manual override dropdowns for both.

## 3. AI Summary — real narrative
Rewrite `summarizeThread` prompt so output is a chronological story, not a one-liner:
> "You emailed X on Jun 12 introducing the service. X replied Jun 14 asking for pricing (warm). You sent a quote Jun 15. X counter-offered Jun 18 at 20% lower. Currently awaiting your response."

Include: who mailed whom, when, intent (intro / followup / quote / negotiation / objection / close), and current state.

## 4. Hot/Warm/Cold classification fix
Rewrite `classifyEmail` prompt with explicit rules + few-shot examples:
- **Hot** — asks for demo, pricing, meeting, or replies with buying intent
- **Warm** — engaged reply, questions, but no buying signal yet
- **Cold** — auto-reply, out-of-office, unsubscribe, "not interested", no reply after N days
Re-run classification on existing threads when user hits "Re-analyze" button.

## 5. Task auto-creation — stop the noise
Only create a task when:
- Inbound message is unreplied for >24h AND classified hot/warm, OR
- User explicitly clicks "Remind me"
Skip if the last message in the thread is **from us** (we already replied).

## 6. AI Assistant — actually do things
Assistant already has tools; add missing ones:
- `getHotLeadsCount(range)`, `getStageBreakdown()`, `summarizeToday()`
- When user asks "how many hot leads this week", answer with the number, not "go click here".

## 7. Push notifications (PWA)
- Add web push registration via service worker.
- Fire push for: new hot lead, reply received on hot thread, task due.

## 8. UI polish
- Fix layout jitter: wrap main scroll area with `min-h-0` and `overflow-y-auto` on the content column only (header stays fixed). Currently everything scrolls together because flex parents don't constrain height.
- Consistent card padding (`p-4`), consistent gap (`gap-3`), remove nested cards.
- Empty states everywhere with clear next action.

## Technical notes
- Sidebar: edit `src/components/app-sidebar.tsx` — remove Contacts, Tasks, Analytics, Notifications, Memory, Search, Radar items.
- Routes: keep files but they become unreachable; deletion optional (safer to keep so old bookmarks don't 404 — redirect to Dashboard).
- `src/routes/_authenticated/app.index.tsx` — merge Radar + Priority Tasks into single dashboard.
- `src/lib/ai.functions.ts` — rewrite `summarizeThread` and `classifyEmail` prompts.
- `src/lib/gmail-sync.server.ts` — add sent folder sync.
- `src/lib/tasks.functions.ts` (or wherever auto-tasks are created) — add "last message is outbound" guard.
- `src/routes/_authenticated/app.tsx` — fix flex/overflow so only main scrolls.

## Out of scope this round
- Full push notification backend (VAPID keys, subscription table) — will scaffold service worker + subscribe flow, but actual delivery requires a cron job we can add next.

## Confirm before I start
This deletes a lot. Say **"go"** and I ship it in one batch.
