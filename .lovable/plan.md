## Final Polish — All 5 Items

Sab kuch ek saath karta hun. Yeh raha exact breakdown:

### 1. Sidebar Unread Badges
- `src/lib/notifications.functions.ts` → add `getUnreadCounts` server fn (inbox unread + notifications unread)
- `src/components/app-sidebar.tsx` → useQuery for counts, render badge pill next to Inbox and Notifications items
- Auto-refetch on 30s interval + invalidate on route change

### 2. Empty States Audit
- `src/routes/_authenticated/app.inbox.tsx` → "Connect your first mailbox" CTA when no threads
- `src/routes/_authenticated/app.pipeline.tsx` → "Add your first lead" CTA when no deals
- `src/routes/_authenticated/app.tasks.tsx` → "Create task" CTA when no tasks
- `src/routes/_authenticated/app.crm.tsx` → "Import contacts" CTA when no contacts
- Consistent style: icon + heading + subtext + primary action button

### 3. Onboarding Mobile Polish
- `src/routes/onboarding.tsx` → verify progress bar + step labels wrap cleanly on mobile
- `src/routes/onboarding.team.tsx` + `onboarding.business-type.tsx` → add "Skip for now" button
- Test flow on 375px viewport

### 4. Security Scan + Fixes
- Run `security--run_security_scan`
- Fix any critical findings (missing RLS / GRANTs)
- Update security memory

### 5. Pre-Launch Verification
- Confirm cron routes registered (`cron.daily-digest`, `cron.escalate`, `cron.sync`)
- Check publish settings (`byteback.digital` custom domain)
- Verify env: `RESEND_API_KEY`, `LOVABLE_API_KEY` present
- Confirm build passes

### Execution Order
1. Backend: notifications count server fn
2. Frontend: sidebar badges + all empty states in parallel
3. Onboarding polish
4. Security scan → fix findings
5. Final verification checklist

### Files Touched (est. ~8-10)
- `src/lib/notifications.functions.ts` (edit)
- `src/components/app-sidebar.tsx` (edit)
- `src/routes/_authenticated/app.inbox.tsx` (edit)
- `src/routes/_authenticated/app.pipeline.tsx` (edit)
- `src/routes/_authenticated/app.tasks.tsx` (edit)
- `src/routes/_authenticated/app.crm.tsx` (edit)
- `src/routes/onboarding.tsx` (edit)
- `src/routes/onboarding.team.tsx` (edit)
- `src/routes/onboarding.business-type.tsx` (edit)
- Plus any migrations from security findings

Approve karo toh build mode me shuru karta hun.
