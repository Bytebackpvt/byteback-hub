import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { Bot, Check, Loader2, Send, Sparkles, X, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { askAssistant } from "@/lib/assistant.functions";
import { sendInstantlyReply } from "@/lib/instantly.functions";

type Draft = {
  threadId: string;
  to: string;
  subject: string;
  body: string;
  mailbox: string;
  source: string;
};
type Activity = { name: string; ok: boolean; summary: string };
type Msg = {
  role: "user" | "assistant";
  content: string;
  activity?: Activity[];
  draft?: Draft | null;
};

const STORAGE_KEY = "byteback.assistant.history.v2";
const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hi 👋 Main ByteBack Assistant hoon. Poochho: *hot leads kitni hain*, *Acme ko warm mark karo*, *John ko reply draft karo* — main khud kar dungi.",
};

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const call = useServerFn(askAssistant);
  const sendReply = useServerFn(sendInstantlyReply);
  const qc = useQueryClient();
  const route = useRouterState({ select: (s) => s.location.pathname });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Msg[];
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const nextHistory: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextHistory);
    setBusy(true);
    try {
      const payload = nextHistory
        .filter((m) => !(m.role === "assistant" && m.content === WELCOME.content))
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await call({ data: { messages: payload, context: { route } } });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply || (res.activity?.length ? "Done." : "…"),
          activity: res.activity,
          draft: res.draft,
        },
      ]);
      // Refresh queries whose data may have changed
      if (res.activity?.some((a) => ["set_lead_status", "set_lead_stage"].includes(a.name))) {
        qc.invalidateQueries({ queryKey: ["lead_scores"] });
      }
      if (res.activity?.some((a) => a.name === "complete_task")) {
        qc.invalidateQueries({ queryKey: ["tasks"] });
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry — ${e instanceof Error ? e.message : "kuch gadbad hui"}.`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setMessages([WELCOME]);
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  async function handleSendDraft(draft: Draft, editedBody: string, msgIdx: number) {
    try {
      await sendReply({
        data: {
          replyToId: draft.threadId,
          eaccount: draft.mailbox,
          subject: draft.subject,
          body: editedBody,
        },
      });
      toast.success("Reply sent");
      // Remove draft from that message
      setMessages((prev) =>
        prev.map((m, i) => (i === msgIdx ? { ...m, draft: null, content: (m.content || "") + "\n\n✓ Reply sent." } : m)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex h-12 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:brightness-110 active:scale-95"
          aria-label="Open assistant"
        >
          <Sparkles className="h-4 w-4" />
          Ask AI
        </button>
      )}
      {open && (
        <div className="fixed bottom-5 right-5 z-40 flex h-[min(620px,85vh)] w-[min(440px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl">
          <header className="flex items-center gap-2 border-b border-border/60 bg-gradient-to-r from-brand/10 to-transparent px-4 py-2.5">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-brand/15 text-brand">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">ByteBack Assistant</div>
              <div className="text-[10px] text-muted-foreground">Actions, drafts, stats — I'll do it</div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={reset}>Clear</Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-3.5 w-3.5" />
            </Button>
          </header>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {messages.map((m, i) => (
              <MessageBubble
                key={i}
                msg={m}
                onSendDraft={(edited) => m.draft && handleSendDraft(m.draft, edited, i)}
              />
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Working…
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-border/60 p-2.5">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
                }}
                placeholder="Kuch bhi puchho ya karvao…"
                rows={1}
                className="min-h-[36px] resize-none py-2 text-sm"
                disabled={busy}
              />
              <Button size="sm" onClick={() => void send()} disabled={busy || !input.trim()} className="h-9 shrink-0 px-3">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MessageBubble({ msg, onSendDraft }: { msg: Msg; onSendDraft: (edited: string) => void }) {
  const [draftBody, setDraftBody] = useState(msg.draft?.body ?? "");
  useEffect(() => { setDraftBody(msg.draft?.body ?? ""); }, [msg.draft?.body]);

  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-brand px-3 py-2 text-white">
          <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-2">
        {msg.activity && msg.activity.length > 0 && (
          <div className="space-y-1">
            {msg.activity.map((a, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]",
                  a.ok
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                    : "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-400",
                )}
              >
                {a.ok ? <Check className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                <span className="font-medium">{a.name}</span>
                <span className="opacity-70">— {a.summary}</span>
              </div>
            ))}
          </div>
        )}
        {msg.content && (
          <div className="rounded-2xl bg-muted/60 px-3 py-2 leading-relaxed">
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        )}
        {msg.draft && (
          <div className="rounded-xl border border-brand/40 bg-brand/5 p-3">
            <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-brand">
              <Sparkles className="h-3 w-3" /> Draft reply
              <span className="ml-auto truncate font-normal text-muted-foreground">
                To: {msg.draft.to}
              </span>
            </div>
            <div className="mb-2 text-[11px] text-muted-foreground">Subject: {msg.draft.subject}</div>
            <Textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={6}
              className="mb-2 resize-none text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setDraftBody(msg.draft?.body ?? "")} className="h-7 text-xs">
                Reset
              </Button>
              <Button size="sm" onClick={() => onSendDraft(draftBody)} className="h-7 text-xs">
                <Send className="h-3 w-3" /> Send
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
