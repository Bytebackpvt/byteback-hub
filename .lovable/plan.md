## Issues to fix

1. **Sent mails only from greenspark** — Instantly `/emails` call is hardcoded to `email_type: "received"`, so sent items from all Instantly mailboxes are dropped. Only Gmail (greenspark) sync stores sent.
2. **Pipeline sort** — cards in each stage are not sorted; "New replies" should be newest → oldest.
3. **"Interested" → shows "Rejected"** — the "→ next" button blindly advances to the next column and Instantly's `interest_status` code mapping is off (e.g. 4 = "not interested" on Instantly's side, not "customer"). Result: moving cards writes wrong status back, and after refresh they show in the wrong column.
4. **Stage/temperature change has no visible feedback** — `setLeadStage` / `setLeadManualStatus` write to `lead_scores` but the thread header re-reads via query without invalidation, and there's no visible pill on the thread row indicating the saved status.
5. **Radar "₹ lacs potential" is fake** — `VALUE_BY_BUCKET` is hardcoded (₹5L / ₹7.5L etc). No money data exists. Misleading.
6. **Not all inbox emails shown** — Instantly `/emails` is capped at `limit: 50`; no pagination. Gmail sync is fine but Instantly-integrated mailboxes are truncated.
7. **Auth UX** — session expiry silently redirects to `/auth`; on `/auth`, `useEffect` calls `getUser()` and if a stale session exists, bounces the user away from the Signup tab straight into the app; the Signup tab flips to Signin on prefilled email. Feels like "logs out randomly, signup becomes login".

## Fixes

### 1. Instantly sent mail (`src/lib/instantly.functions.ts`)
- Fetch two pages: `email_type=received` and `email_type=sent`, merge, tag `direction`.
- Increase `limit` to 100 and paginate via `starting_after` up to ~500 rows.

### 2 & 3. Pipeline sort + accurate move (`src/lib/instantly.functions.ts`, `src/routes/_authenticated/app.pipeline.tsx`)
- Add `activityAt: string | null` to `InstantlyLead`; sort each stage bucket by `activityAt` desc.
- Fix `STATUS_TO_INTEREST` map to match Instantly's actual codes: `interested=1, meeting=2, customer=3, not-interested=-1`. (Adjust `leadStatus` reader to match.)
- Replace card "→ next" button with a **stage dropdown** on each card so users pick the exact stage. Keep drag-drop optional.

### 4. Visible temperature/stage on threads (`src/routes/_authenticated/app.inbox.tsx`)
- Invalidate `["lead_scores"]` after `setLeadManualStatus`/`setLeadStage`.
- Render a small pill next to each thread in the list showing current manual status ("Hot"/"Warm"/"Cold") and stage ("Meeting"/"Won"/…) when set, so changes are visible immediately.

### 5. Radar honesty (`src/lib/radar.functions.ts`, `src/routes/_authenticated/app.radar.tsx`)
- Remove `VALUE_BY_BUCKET` and all `₹` potential display. Keep counts + headline in plain language ("3 hot leads waiting to reply · 5 demos pending").
- Update route UI to drop the ₹ chips.

### 6. Instantly pagination — covered by #1 (fetch up to ~500).

### 7. Auth UX (`src/routes/auth.tsx`, `src/lib/attach-supabase-auth.ts`)
- On `/auth`, do NOT auto-bounce when a session exists **unless** query param `?next=` is set. Instead render a small "You're signed in — go to app" banner with a "Sign out" button.
- Don't switch tab to Signin when `?email=` is prefilled; respect the user's tab click.
- In the attacher, when there's no session, redirect only once per navigation (avoid loops) and only if the current path is inside `/app`.

## Not touched
- Gmail sync itself (already unlimited).
- AI classification, task auto-creation.
- New DB schema — everything uses existing tables.

## Test steps after ship
1. Reopen Unibox → toggle "Sent" — messages from every mailbox (not just greenspark) appear.
2. Pipeline "New replies" column sorts newest first.
3. Move an "Interested" lead → column reflects the exact click; refresh keeps it there.
4. Mark a thread "Hot" → pill appears immediately in list.
5. Radar page shows counts, no ₹ figures.
6. Session expires → `/auth` shows "You're signed in" banner OR clean signup form; switching tabs is sticky.
