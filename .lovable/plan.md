
# ByteBack Inbox AI — v1 Build Plan

Scope: marketing landing page, authentication screens, and the 5-step onboarding flow. No backend, no real email integrations, no dashboard/inbox internals yet. All auth methods are UI-only (buttons work, no wiring).

## Design system

- Aesthetic: Apple + Linear + Superhuman. Minimal, high-contrast, generous whitespace, soft shadows, subtle glassmorphism on nav and cards, tasteful micro-animations (fade/slide on scroll, spring on hover).
- Theme: system-preference default with manual light/dark toggle. Both themes fully tuned via `src/styles.css` design tokens (oklch).
- Typography: Inter Tight for display + Inter for body (via @fontsource), tight tracking on headings.
- Palette: near-black background (dark) / off-white (light) + a single vivid accent (electric indigo `oklch(0.62 0.22 274)`), muted borders, soft gradient orbs behind hero.
- Radius: 12–16px cards, 10px buttons. Motion via Tailwind transitions + a light Framer Motion for hero/section reveals.

## Routes (TanStack Start, file-based)

```
src/routes/
  __root.tsx                  (update: real meta, theme provider, font imports)
  index.tsx                   (landing page)
  auth.tsx                    (sign in / sign up — tabs; Google, Microsoft, Email, OTP, 2FA UI)
  onboarding.tsx              (layout with progress bar + <Outlet/>)
  onboarding.index.tsx        (redirect → /onboarding/workspace)
  onboarding.workspace.tsx    (Step 1: create workspace)
  onboarding.team.tsx         (Step 2: invite team)
  onboarding.email-accounts.tsx (Step 3: connect email accounts — provider tiles)
  onboarding.business-type.tsx  (Step 4: select business type)
  onboarding.done.tsx         (Step 5: success + CTA to dashboard placeholder)
```

Each route file gets its own `head()` with unique title/description/OG tags.

## Landing page sections (`/`)

1. Sticky glass nav — logo, Features, Pricing, FAQ, Blog, Sign in, Start Free.
2. Hero — headline "One Inbox. Every Lead. Zero Missed Opportunities.", subtitle, dual CTAs (Start Free, Book Demo), tertiary Watch Demo link, subtle animated gradient + product mock preview card.
3. Logo marquee — Instantly, Smartlead, Google Workspace, Microsoft 365, Outlook, Apollo, Lemlist, Saleshandy (auto-scrolling).
4. Problem/solution band — 3 short cards.
5. Features grid — bento layout: Unified Inbox, AI Classification, AI Priority, Notifications, CRM, Tasks, Analytics, Team Collaboration, AI Search.
6. AI Summary showcase — mock daily summary card.
7. Target customers — icon chips row.
8. Pricing — 4 tiers (Starter free, Growth, Business, Enterprise) with feature bullets; monthly/annual toggle (visual only).
9. Testimonials — 3 quote cards.
10. FAQ — accordion, 8 items.
11. Final CTA band.
12. Footer — product, company, resources, legal, socials.

## Auth screen (`/auth`)

Tabs: Sign in / Sign up. Buttons for Continue with Google, Continue with Microsoft, plus Email + password fields, "Send OTP" link, and a 2FA code stub screen. Trust row (SOC2, GDPR badges). No backend calls — buttons route to `/onboarding/workspace` for demo.

## Onboarding flow

Shared layout: centered card, top progress indicator (1/5 … 5/5), Back/Continue buttons, keyboard-friendly.

- Step 1 Workspace: name + logo upload placeholder.
- Step 2 Team: multi-email invite chips, Skip option.
- Step 3 Email accounts: provider tiles (Google Workspace, Gmail, Microsoft 365, Outlook, IMAP, SMTP) with "Connect" (opens stub modal). Show connected list.
- Step 4 Business type: card grid (IT Company, Agency, Healthcare, Manufacturing, ITAD, Refurbished Laptops, Rental, Other).
- Step 5 Done: confetti-lite success, "Go to Dashboard" button → `/` for now (with toast noting dashboard is next milestone).

State kept in a small Zustand store (`src/stores/onboarding.ts`), persisted to localStorage so refresh works.

## Non-goals for v1

- No Lovable Cloud, no Supabase, no real auth, no email provider OAuth, no AI calls, no dashboard, unified inbox, CRM, tasks, analytics, mobile Capacitor build. These are staged for follow-up milestones.

## Technical notes

- Add deps: `framer-motion`, `@fontsource-variable/inter`, `zustand`, `lucide-react` (already present with shadcn).
- Theme provider: small `ThemeProvider` in `__root.tsx` writing `.dark` on `<html>` based on system + user override stored in localStorage.
- Replace placeholder in `src/routes/index.tsx`.
- Update `__root.tsx` head to real ByteBack meta (title, description, OG, Twitter).
- All colors go through design tokens — no hardcoded hex in components.
- Responsive: mobile-first; nav collapses to sheet menu at <md.

## Follow-up milestones (not this pass)

1. Enable Lovable Cloud, real Google/Microsoft/email/OTP auth, workspace persistence.
2. Dashboard shell + Unified Inbox with mock data.
3. AI classification + summaries via Lovable AI Gateway.
4. CRM (contacts/companies/deals/pipeline), Tasks, Analytics.
5. Capacitor mobile packaging.
