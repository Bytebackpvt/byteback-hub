Aapki 4 complaints samajh gayi. Ek-ek ka fix:

## 1. AI assistant khud kaam kare (guide nahi, doer bane)
Abhi bs "yaha jao, click karo" bolta hai. Naya version me **tools** honge — assistant khud database me action karega:
- `set_lead_status(email, hot|warm|cold|not-interested)` — turant mark
- `set_lead_stage(email, open|contacted|meeting|won|lost|churned)`
- `list_leads(status?, stage?, since?, limit?)` — actual data DB se
- `get_stats(range: today|week|month)` — real counts
- `list_tasks(status?)`, `complete_task(id)`, `snooze_task(id, days)`
- `draft_reply(threadId, intent)` — draft banake dikhaye, user edit/send kare
- `send_reply(threadId, body)` — confirm ke baad bhejna

Chat me tool calls dikhenge ("✓ Marked Acme Corp as hot"). Reply karne ka draft chat me aayega + **Edit** aur **Send** buttons.

## 2. Lead status/stage Inbox me shift
Contacts se dropdowns hata dungi. Inbox me har thread ke top-right pe:
- Status pill (hot/warm/cold/not-interested) — click to change
- Stage pill (open→won etc.)
- "Mark as..." quick menu

Contacts page sirf directory rahega (search + view), koi editing waha nahi.

## 3. Task pe action buttons + editable AI drafts
Har task card me abhi sirf checkbox hai. Add karungi:
- **Reply** button → AI draft khulega inline (editable textarea, pre-filled)
- **Send** / **Save draft** / **Regenerate** buttons
- **Snooze** dropdown (1d / 3d / 1w)
- **Skip** (task close bina reply ke)
Checkbox turant complete karega jaisa abhi hai, but ab options bhi milenge.

## 4. Real data audit (dashboard + radar + inbox sort)
- Dashboard priority tasks: query me `order by created_at desc` + real join se lead info fix.
- Opportunity Radar: check karungi ki signals actual emails se aa rahe hain, mock nahi.
- Inbox: sort by `received_at desc` enforce (abhi kahi kahi random hai).
- Full email sync check: Instantly + Gmail dono ka last-sync timestamp aur count log karke verify karungi.

---

## Technical
- **New tools in** `src/lib/assistant.functions.ts` — replace plain chat call with tool-calling loop (Gemini function calling).
- **UI**: chat message renderer me tool-result cards + reply-draft card with edit/send.
- **Edited**: `app.inbox.tsx` (status/stage pills per thread), `app.crm.tsx` (remove dropdowns), `app.tasks.tsx` (action buttons + inline draft), `app.index.tsx` (dashboard queries), `app.radar.tsx` (data check).
- **Server fns reused**: `setLeadManualStatus`, `setLeadStage`, `saveLeadScore`, existing draft/send fns from `followups.functions.ts`.

Bada kaam hai (~45 min). Priority order — pehle 1+3 (assistant + task actions) karu ya 2+4 (inbox controls + data fix) pehle? Ya sab ek saath approve?
