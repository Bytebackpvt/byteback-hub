Aapki 5 problems samajh gayi. Ek-ek karke fix karungi. Confirm karo phir shuru:

## 1. Global AI Assistant (naya floating chat)
Har page pe bottom-right ek floating chat button. Aap kuch bhi pooch sakti ho:
- **Info queries**: "is section me kya hota hai?", "hot leads kitni hain?", "is week kitni warm leads aayi?"
- **Actions**: "Acme Corp ko hot mark karo", "John ke liye follow-up email draft karo", "Instantly disconnect karo", "is lead ka summary do"

Assistant ke paas tools honge jo actual app functions call karenge (mark lead, draft email, list leads by status/date, connect/disconnect integration, summarize lead, navigate to section). Chat history localStorage me save hogi.

## 2. Manual lead controls (Contacts page)
Har contact row me:
- **Status dropdown**: hot / warm / cold / not-interested (AI score ke saath override kar sakti ho)
- **Stage dropdown**: open / contacted / meeting / won / lost / churned
- Dono changes DB me save honge, AI ke score ko override karenge (manual = source of truth).

Pipeline page pe bhi drag ya dropdown se stage change hoga (already partial hai, complete karungi).

## 3. UI cleanup
- Contacts, Inbox, Pipeline: sticky headers + independent scroll areas (page scroll aur list scroll alag).
- Detail panels (lead open karne pe) side drawer me — pura page dhakke nahi lagega.
- Density kam karungi: extra borders, gradients, badges hatake clean look.

## 4. Lovable branding hatana
- Har jagah "Lovable" mention / logo / powered-by badge check karke hatana.
- Error pages, meta tags, footer, email templates sab me.

## 5. Scroll fix
Root cause: `main` element ka overflow galat set hai, aur kuch pages me nested scroll containers nahi hain. Har major page ko `h-full flex flex-col` + inner `flex-1 overflow-auto` pattern pe convert karungi taki header sticky rahe aur sirf list scroll ho.

---

## Technical breakdown
- **New**: `src/components/ai-assistant.tsx` (floating chat with AI SDK), `src/routes/api/assistant.ts` (streaming endpoint with tool-calling using existing server fns).
- **DB**: `contacts` table me `manual_status` aur `stage` columns add karungi (migration).
- **Edited**: `app.crm.tsx` (dropdowns), `app.pipeline.tsx` (stage update), `app.tsx` layout (mount assistant + scroll fix), `__root.tsx` (branding), plus grep-based Lovable branding sweep.
- **Assistant tools**: `listLeadsByStatus`, `setLeadStatus`, `setLeadStage`, `draftEmail`, `summarizeLead`, `navigateTo`, `disconnectIntegration`, `getStats`.

Kaafi bada kaam hai — 30-45 min lagenge. Approve karo toh shuru karu?