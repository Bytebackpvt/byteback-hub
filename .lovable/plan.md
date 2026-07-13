## Problem

1. Dashboard ke **Opportunity Radar** aur **Today's Priority Actions** me kisi bhi lead / row par click karne se inbox to khulta hai, lekin hamesha sabse recent email pe land karta hai — kyunki inbox thread selection sirf local `useState` me hai, URL me nahi. Koi bhi outside link `/app/inbox` pe aata hai, aur pehla thread select ho jata hai.
2. **Top tasks** section me sirf title dikh raha hai — customer ko kya kehna hai, kaunse lead se juda hai, kab tak karna hai — kuch clear nahi.

## Fix (frontend/presentation only)

### 1) Inbox ko deep-linkable banao — `?thread=<id>`
- `src/routes/_authenticated/app.inbox.tsx` me route par `validateSearch` add karo: `{ thread?: string }`.
- Component me `Route.useSearch()` se `thread` padho. Initial `selectedId` URL se aaye (agar valid ho), warna current default.
- Jab user thread badle, `navigate({ search: { thread: id }, replace: true })` — URL sync rahe, back button na tootey.
- Agar URL me diya gaya `thread` list me na mile, chup-chap pehla thread fallback.

### 2) Priority Actions rows ko sahi lead pe le jao
- `src/routes/_authenticated/app.index.tsx` (`PriorityRow`): AI ke `action.target` ("Name @ Company") ko `hot`/`threads` list ke against match karke thread id nikaalo (name+company substring, case-insensitive).
- Match mile to `<Link to="/app/inbox" search={{ thread: matchedId }}>`. Match na mile to jaisa hai — category ke hisaab se `/app/inbox` / `/app/tasks` / `/app/analytics`.
- Same file ke **Hot replies** list ke `<Link to="/app/inbox">` ko `search={{ thread: t.id }}` ke saath update karo.

### 3) Radar rows par thread deep-link
- `src/routes/_authenticated/app.radar.tsx` me har item ka `Link` build karte waqt: agar `item.thread_key` ya `item.link` me thread id ho, `to="/app/inbox"` + `search={{ thread: <id> }}` use karo (thread_key ko string id maano). Warna current `item.link` fallback.
- Type cast `as "/app/notifications"` hata do; proper `to` string do.

### 4) Top tasks section ko samajhne yogya banao
- `src/routes/_authenticated/app.index.tsx` ke **Top tasks** card me:
  - Heading ke neeche ek chhoti helper line: "Jinhe aaj complete karna hai — har task ek lead / follow-up se juda hai."
  - Har row me current title ke saath: due date (agar hai) — "Due today / Overdue 2d / Fri" — aur linked lead ka naam (already `t.linked_to` dikhta hai, format tighten karo: "Follow up · Alex @ Acme").
  - AI-generated tasks (`t.source === "ai"`) par ek chhota "AI suggested" tooltip/label taaki user ko pata chale kyu banaya gaya.
  - Row ka link `<Link to="/app/tasks" search={{ task: t.id }}>` (tasks page agar param na padhe to koi harm nahi; UI ke liye at least href specific hoga). Tasks page me search param abhi na wire karein — scope UI-only.

### Files touched
- `src/routes/_authenticated/app.inbox.tsx` — search param + initial selection + sync on change.
- `src/routes/_authenticated/app.index.tsx` — PriorityRow target matching, Hot list `search`, Top tasks copy + subtitle.
- `src/routes/_authenticated/app.radar.tsx` — items use `search={{ thread }}` when available.

Koi backend / server-fn / DB change nahi. AI prompt bhi waise hi — matching client-side hogi jisse existing hot threads reliably link ho jayein.
