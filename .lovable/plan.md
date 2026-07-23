# Bring back the Dashboard + smarter AI summaries

Aapki baat sahi hai — Inbox alone se pata nahi chalta ki *abhi kispe kaam karna hai*. Dashboard wapas la rahi hoon, but ek "action cockpit" ke roop mein — CRM jaisa nahi. Sath hi AI summary ko multi-mailbox aware bana rahi hoon.

## 1. Dashboard wapas — as the landing page

Route: `/app` → redirect ab `/app/dashboard` pe jaayega (Inbox ek tab rahega, hataya nahi).

Sidebar: **Dashboard · Inbox · Stages · Integrations · Settings**

Dashboard layout (single scroll, dense cards):

```text
┌─────────────────────────────────────────────────────┐
│  Good morning, Anjali · 3 things need you now       │
├──────────────┬──────────────┬───────────────────────┤
│ 🔥 Hot leads │ ⏰ Follow-up │ 📭 Unreplied         │
│ (waiting)    │  due now     │  > 4h                │
│  [list 5]    │  [list 5]    │  [list 5]            │
├──────────────┴──────────────┴───────────────────────┤
│  ✅ Priority tasks (today + overdue)  [list 10]     │
├─────────────────────────────────────────────────────┤
│  🧠 Recent AI & manual changes (audit feed)         │
│  • AI marked "Acme quote" as Hot · 2m ago           │
│  • You moved "XYZ" to Demo Requested · 10m ago      │
│  • AI suggested reply to "PQR" · 15m ago            │
└─────────────────────────────────────────────────────┘
```

Har row click → uska Inbox thread khulta hai.

## 2. "Recent changes" feed — naya section

Ek dedicated card + full page (`/app/activity`) jo dikhaye:
- AI ne kya classify/suggest kiya (temperature, stage, next action)
- User ne kya manually badla (stage/temperature override)
- Kis thread pe, kab, kisne

Data source: existing `lead_audit_log` + `ai_events` tables — dono ko merge karke chronological feed. Yehi feed follow-up decisions ka base banega.

## 3. AI summary — multi-mailbox & reply-aware

Abhi `assistant.functions.ts` sirf latest message dekhta hai. Upgrade:

**Input to AI:** poora thread + mailbox context
- Original inbound: `asset.purchase@... ← customer@...`
- Outbound: `procurement@greenspark → customer@...`
- All follow-ups in order

**Output (structured):**
```json
{
  "intent": "asset purchase inquiry",
  "conversation_state": "customer replied to our quote",
  "who_replied_last": "customer" | "us" | "auto-responder",
  "our_reply_quality": "good | needs_followup | missed_question",
  "next_action": "Send pricing breakdown for 50 laptops",
  "next_action_owner": "procurement@greenspark",
  "risks": ["customer asked for warranty terms — not answered"],
  "suggested_reply": "..."
}
```

Key additions:
- **Cross-mailbox awareness**: AI ko batayenge ki inbound `asset.purchase` pe aaya, reply `procurement` se gaya — same conversation hai, alag persona nahi.
- **Reply quality check**: AI khud analyse karega ki humara last reply customer ke sawaal ka jawab de raha hai ya nahi. Agar miss hua → flag "needs_followup" + reason.
- **Reply direction detection**: last message customer ka hai ya humara — isse "waiting for us" vs "waiting for customer" clear hoga.

Cache in `ai_insights_cache` keyed on `thread_id + message_count` (recompute jab naya message aaye).

## 4. Inbox row — surface the new insight

Har row pe ek chhota badge: **"AI: needs follow-up"** ya **"AI: customer waiting"** — dashboard ki Unreplied/Follow-up lists yahi signal use karengi.

## Technical details

**Files to add/change:**
- `src/routes/_authenticated/app.dashboard.tsx` — new landing
- `src/routes/_authenticated/app.index.tsx` — redirect `/app/dashboard`
- `src/routes/_authenticated/app.activity.tsx` — full audit + AI feed
- `src/components/app-sidebar.tsx` — add Dashboard link
- `src/lib/dashboard.functions.ts` — server fn returning `{ hotLeads, followupsDue, unreplied, tasks, recentActivity }`
- `src/lib/assistant.functions.ts` — new prompt + structured output with reply-quality
- `src/lib/ai-insights-cache` reuse existing table
- `src/components/ai-insight-panel.tsx` — render new fields (`our_reply_quality`, `risks`, `next_action_owner`)

**No schema migration needed** — `lead_audit_log`, `ai_events`, `ai_insights_cache`, `tasks`, `email_threads` sab already hain.

**Model:** `google/gemini-3-flash` for summaries (cheap, fast, structured-output capable).

## Order

1. Dashboard page + server fn (30 min)
2. Sidebar + redirect
3. Activity feed page
4. AI summary rewrite + new panel fields

Approve karo, main step 1 se shuru karti hoon.
