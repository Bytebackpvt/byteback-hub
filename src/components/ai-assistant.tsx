import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { askAssistant } from "@/lib/assistant.functions";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "byteback.assistant.history";
const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hi 👋 I'm your ByteBack assistant. Poochho — kaunsa section kya karta hai, kitni hot leads hain, ya kaise koi kaam kare. Main help kar dungi.",
};

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const call = useServerFn(askAssistant);
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
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      /* ignore */
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function readStats() {
    const inbox = qc.getQueryData<{ threads?: Array<{ unread?: boolean; priority?: string }> }>([
      "inbox",
    ]);
    const scores = qc.getQueryData<{ scores?: Array<{ manual_status?: string | null; score: number }> }>([
      "lead_scores",
    ]);
    const tasks = qc.getQueryData<{ tasks?: Array<{ done?: boolean }> }>(["tasks"]);
    const leads = qc.getQueryData<{ leads?: Array<unknown> }>(["instantly", "leads"]);
    const scoreArr = scores?.scores ?? [];
    const bucket = (s: { manual_status?: string | null; score: number }) => {
      if (s.manual_status) return s.manual_status;
      if (s.score >= 80) return "hot";
      if (s.score >= 60) return "warm";
      if (s.score > 0) return "cold";
      return "unscored";
    };
    return {
      totalLeads: leads?.leads?.length ?? 0,
      hotLeads: scoreArr.filter((s) => bucket(s) === "hot").length,
      warmLeads: scoreArr.filter((s) => bucket(s) === "warm").length,
      coldLeads: scoreArr.filter((s) => bucket(s) === "cold").length,
      unreadInbox: inbox?.threads?.filter((t) => t.unread).length ?? 0,
      openTasks: tasks?.tasks?.filter((t) => !t.done).length ?? 0,
    };
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const nextHistory: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextHistory);
    setBusy(true);
    try {
      const payload = nextHistory
        .filter((m) => m.role !== "assistant" || m.content !== WELCOME.content)
        .slice(-12);
      const { reply } = await call({
        data: { messages: payload, context: { route, stats: readStats() } },
      });
      setMessages((prev) => [...prev, { role: "assistant", content: reply || "…" }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry — ${e instanceof Error ? e.message : "kuch gadbad hui"}. Thodi der baad try karo.`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setMessages([WELCOME]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
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
        <div className="fixed bottom-5 right-5 z-40 flex h-[min(560px,80vh)] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl">
          <header className="flex items-center gap-2 border-b border-border/60 bg-gradient-to-r from-brand/10 to-transparent px-4 py-2.5">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-brand/15 text-brand">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">ByteBack Assistant</div>
              <div className="text-[10px] text-muted-foreground">Ask about anything in this app</div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={reset}>
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </header>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed",
                    m.role === "user"
                      ? "bg-brand text-white"
                      : "bg-muted/60 text-foreground",
                  )}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Thinking…
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
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Kuch bhi puchho…"
                rows={1}
                className="min-h-[36px] resize-none py-2 text-sm"
                disabled={busy}
              />
              <Button
                size="sm"
                onClick={() => void send()}
                disabled={busy || !input.trim()}
                className="h-9 shrink-0 px-3"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
