import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  Bot,
  CheckCheck,
  Clock,
  Filter,
  Inbox as InboxIcon,
  Loader2,
  Reply,
  Search,
  Send,
  Sparkles,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { generateReply, summarizeThread } from "@/lib/ai.functions";
import {
  CATEGORY_META,
  MAILBOXES,
  PRIORITY_META,
  THREADS,
  type Thread,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/inbox")({
  component: InboxPage,
});

function InboxPage() {
  const [mailbox, setMailbox] = useState("all");
  const [selectedId, setSelectedId] = useState<string>(THREADS[0].id);
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const [aiReplies, setAiReplies] = useState<Record<string, string>>({});
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingReply, setLoadingReply] = useState(false);

  const callGenerateReply = useServerFn(generateReply);
  const callSummarize = useServerFn(summarizeThread);

  const filtered = useMemo(() => {
    return THREADS.filter((t) => {
      if (mailbox !== "all" && t.mailbox !== mailbox) return false;
      if (search && !`${t.from.name} ${t.subject} ${t.preview}`.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [mailbox, search]);

  const selected = THREADS.find((t) => t.id === selectedId) ?? filtered[0];

  return (
    <div className="grid h-[calc(100vh-3rem)] grid-cols-[240px_360px_1fr]">
      {/* Mailboxes column */}
      <aside className="flex flex-col border-r border-border/60 bg-muted/20">
        <div className="border-b border-border/60 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mailboxes
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-0.5 p-2">
            {MAILBOXES.map((mb) => {
              const active = mailbox === mb.id;
              const count =
                mb.id === "all"
                  ? THREADS.length
                  : THREADS.filter((t) => t.mailbox === mb.id).length;
              return (
                <button
                  key={mb.id}
                  onClick={() => setMailbox(mb.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition",
                    active ? "bg-background font-medium shadow-sm" : "hover:bg-background/60",
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", mb.color)} />
                  <span className="flex-1 truncate text-left">{mb.label}</span>
                  <span className="text-[11px] text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-2 px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </div>
          <div className="space-y-0.5 p-2 pt-0">
            {Object.entries(CATEGORY_META).slice(0, 6).map(([k, v]) => (
              <button
                key={k}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-background/60"
              >
                <span className={cn("h-2 w-2 rounded-full", v.dot)} />
                {v.label}
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Thread list */}
      <section className="flex flex-col border-r border-border/60">
        <div className="flex items-center gap-2 border-b border-border/60 p-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search replies…"
              className="h-8 pl-8"
            />
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Filter className="h-3.5 w-3.5" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div>
            {filtered.map((t) => (
              <ThreadRow
                key={t.id}
                thread={t}
                active={selected?.id === t.id}
                onClick={() => setSelectedId(t.id)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <InboxIcon className="mx-auto mb-2 h-6 w-6 opacity-40" />
                No matches.
              </div>
            )}
          </div>
        </ScrollArea>
      </section>

      {/* Thread detail */}
      <section className="flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-border/60 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      PRIORITY_META[selected.priority].className,
                    )}
                  >
                    {PRIORITY_META[selected.priority].label}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      CATEGORY_META[selected.category].className,
                    )}
                  >
                    {CATEGORY_META[selected.category].label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">via {selected.mailbox}</span>
                </div>
                <h1 className="mt-2 truncate text-lg font-semibold tracking-tight">
                  {selected.subject}
                </h1>
                <div className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{selected.from.name}</span>{" "}
                  · {selected.from.email} · {selected.from.company}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Star className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Clock className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Archive className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <CheckCheck className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="mx-auto max-w-3xl space-y-4 p-6">
                <div className="rounded-xl border border-brand/30 bg-gradient-to-br from-brand/10 to-transparent p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-brand">
                    <Sparkles className="h-3.5 w-3.5" /> AI summary
                  </div>
                  <p className="mt-1.5 text-sm text-foreground/90">{selected.aiSummary}</p>
                </div>

                <div className="rounded-xl border border-border/70 bg-background p-5">
                  <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{selected.receivedAt}</span>
                    <span>To {selected.mailbox}</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                    {selected.body}
                  </pre>
                </div>

                {selected.suggestedReply && (
                  <div className="rounded-xl border border-border/70 bg-card">
                    <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2 text-xs font-semibold text-muted-foreground">
                      <Bot className="h-3.5 w-3.5 text-brand" /> Suggested reply
                      <button
                        onClick={() => setReply(selected.suggestedReply)}
                        className="ml-auto text-[11px] font-medium text-brand hover:underline"
                      >
                        Use draft
                      </button>
                    </div>
                    <div className="p-4">
                      <Textarea
                        value={reply || selected.suggestedReply}
                        onChange={(e) => setReply(e.target.value)}
                        rows={6}
                        className="resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                      />
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Sparkles className="h-3 w-3" /> Tone: warm · Length: brief
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Reply className="h-3.5 w-3.5" /> Regenerate
                          </Button>
                          <Button size="sm">
                            <Send className="h-3.5 w-3.5" /> Send reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
            Select a thread
          </div>
        )}
      </section>
    </div>
  );
}

function ThreadRow({
  thread,
  active,
  onClick,
}: {
  thread: Thread;
  active: boolean;
  onClick: () => void;
}) {
  const cat = CATEGORY_META[thread.category];
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-1 border-b border-border/50 px-3 py-3 text-left transition",
        active ? "bg-accent/60" : "hover:bg-accent/30",
        thread.unread && !active && "bg-background",
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", cat.dot)} />
        <span
          className={cn(
            "flex-1 truncate text-sm",
            thread.unread ? "font-semibold text-foreground" : "text-foreground/80",
          )}
        >
          {thread.from.name}
        </span>
        <span className="shrink-0 text-[10px] text-muted-foreground">{thread.receivedAt}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {thread.priority === "hot" && (
          <span className="rounded bg-rose-500/15 px-1 text-[9px] font-bold uppercase text-rose-500">
            Hot
          </span>
        )}
        <div className="truncate text-xs font-medium text-foreground/90">{thread.subject}</div>
      </div>
      <div className="line-clamp-1 text-xs text-muted-foreground">{thread.preview}</div>
    </button>
  );
}
