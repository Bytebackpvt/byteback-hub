import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  Bot,
  CheckCheck,
  Clock,
  Filter,
  Inbox as InboxIcon,
  Loader2,
  Plug,
  Reply,
  Search,
  Send,
  Sparkles,
  Star,
} from "lucide-react";

import { AiInsightPanel } from "@/components/ai-insight-panel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { generateReply, summarizeThread } from "@/lib/ai.functions";
import {
  listInstantlyMailboxes,
  listInstantlyThreads,
  sendInstantlyReply,
} from "@/lib/instantly.functions";
import { scanForNotifications } from "@/lib/notifications.functions";
import { autoScheduleFollowUps } from "@/lib/followups.functions";
import {
  CATEGORY_META,
  MAILBOXES,
  PRIORITY_META,
  THREADS,
  type Thread,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const inboxSearchSchema = z.object({
  thread: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_authenticated/app/inbox")({
  validateSearch: zodValidator(inboxSearchSchema),
  component: InboxPage,
});

function InboxPage() {
  const { thread: threadParam } = Route.useSearch();
  const navigate = useNavigate({ from: "/app/inbox" });
  const [mailbox, setMailbox] = useState("all");
  const [selectedId, setSelectedId] = useState<string>(threadParam || THREADS[0].id);
  // On phones we drill into the reader; on md+ both list and reader are visible together.
  const [mobileReaderOpen, setMobileReaderOpen] = useState<boolean>(!!threadParam);
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const [aiReplies, setAiReplies] = useState<Record<string, string>>({});
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingReply, setLoadingReply] = useState(false);
  const [sending, setSending] = useState(false);
  // Local UX state for star / snooze / archive / read overlaid on threads.
  type ThreadFlags = { starred?: boolean; snoozedUntil?: number; archived?: boolean; read?: boolean };
  const [flags, setFlags] = useState<Record<string, ThreadFlags>>({});
  const [filter, setFilter] = useState<"all" | "unread" | "starred">("all");


  const callGenerateReply = useServerFn(generateReply);
  const callSummarize = useServerFn(summarizeThread);
  const callListThreads = useServerFn(listInstantlyThreads);
  const callListMailboxes = useServerFn(listInstantlyMailboxes);
  const callSendReply = useServerFn(sendInstantlyReply);
  const callScan = useServerFn(scanForNotifications);
  const callAutoSchedule = useServerFn(autoScheduleFollowUps);

  const threadsQuery = useQuery({
    queryKey: ["instantly", "threads"],
    queryFn: () => callListThreads(),
    staleTime: 30_000,
  });
  const mailboxesQuery = useQuery({
    queryKey: ["instantly", "mailboxes"],
    queryFn: () => callListMailboxes(),
    staleTime: 60_000,
  });

  const liveThreads: Thread[] = useMemo(() => {
    const items = threadsQuery.data?.threads ?? [];
    return items.map((t) => ({
      ...t,
      starred: false,
      aiSummary: "",
      suggestedReply: "",
    }));
  }, [threadsQuery.data]);

  const connected = threadsQuery.data?.connected === true;
  const activeThreads: Thread[] = connected && liveThreads.length > 0 ? liveThreads : THREADS;

  // Fire notification scan + auto follow-up scheduling whenever the live inbox loads.
  useEffect(() => {
    if (!connected || liveThreads.length === 0) return;
    const payload = liveThreads.slice(0, 50).map((t) => ({
      id: t.id,
      fromName: t.from.name,
      company: t.from.company,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      unread: t.unread,
    }));
    callScan({ data: { threads: payload } }).catch(() => {});

    const followupCats = new Set([
      "meeting",
      "interested",
      "objection",
      "not-now",
      "not-interested",
      "ooo",
      "unsubscribe",
      "spam",
    ]);
    const fu = liveThreads
      .filter((t) => followupCats.has(t.category))
      .slice(0, 25)
      .map((t) => ({
        id: t.id,
        fromName: t.from.name,
        company: t.from.company,
        category: t.category as
          | "meeting"
          | "interested"
          | "objection"
          | "not-now"
          | "not-interested"
          | "ooo"
          | "unsubscribe"
          | "spam",
        sentiment:
          t.priority === "hot"
            ? ("positive" as const)
            : t.category === "objection" || t.category === "not-interested"
              ? ("negative" as const)
              : ("neutral" as const),
      }));
    if (fu.length) callAutoSchedule({ data: { threads: fu } }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, liveThreads.length]);

  const mailboxes = useMemo(() => {
    const live = mailboxesQuery.data?.mailboxes ?? [];
    if (!connected || live.length === 0) return MAILBOXES;
    return [
      { id: "all", label: "All inboxes", color: "bg-brand" },
      ...live.map((m, i) => ({
        id: m.email,
        label: m.email,
        color: ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-pink-500", "bg-violet-500"][i % 5],
      })),
    ];
  }, [mailboxesQuery.data, connected]);

  useEffect(() => {
    if (activeThreads.length && !activeThreads.some((t) => t.id === selectedId)) {
      setSelectedId(activeThreads[0].id);
    }
  }, [activeThreads, selectedId]);

  // Honor deep-links: if URL ?thread=<id> matches a loaded thread, select it.
  useEffect(() => {
    if (!threadParam) return;
    if (activeThreads.some((t) => t.id === threadParam) && threadParam !== selectedId) {
      setSelectedId(threadParam);
    }
  }, [threadParam, activeThreads, selectedId]);

  function selectThread(id: string) {
    setSelectedId(id);
    setMobileReaderOpen(true);
    navigate({ search: (prev: { thread?: string }) => ({ ...prev, thread: id }), replace: true });
  }

  // Auto-draft: on thread select, generate an AI reply in the background if none exists.
  useEffect(() => {
    if (!selectedId) return;
    const t = activeThreads.find((x) => x.id === selectedId);
    if (!t) return;
    if (aiReplies[selectedId] || t.suggestedReply) return;
    if (loadingReply) return;
    if (t.category === "unsubscribe" || t.category === "spam" || t.category === "ooo") return;
    let cancelled = false;
    setLoadingReply(true);
    callGenerateReply({
      data: {
        from: t.from.email,
        company: t.from.company,
        subject: t.subject,
        body: t.body,
        tone: "warm",
        length: "brief",
      },
    })
      .then(({ text }) => {
        if (!cancelled) setAiReplies((r) => ({ ...r, [t.id]: text }));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingReply(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);


  const filtered = useMemo(() => {
    const now = Date.now();
    return activeThreads.filter((t) => {
      const f = flags[t.id] ?? {};
      if (f.archived) return false;
      if (f.snoozedUntil && f.snoozedUntil > now) return false;
      if (mailbox !== "all" && t.mailbox !== mailbox) return false;
      if (search && !`${t.from.name} ${t.subject} ${t.preview}`.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (filter === "unread" && (f.read || !t.unread)) return false;
      if (filter === "starred" && !f.starred) return false;
      return true;
    });
  }, [activeThreads, mailbox, search, flags, filter]);

  const selected = activeThreads.find((t) => t.id === selectedId) ?? filtered[0];
  const selFlags = selected ? (flags[selected.id] ?? {}) : {};

  function setFlag(id: string, patch: Partial<ThreadFlags>) {
    setFlags((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }
  function toggleStar() {
    if (!selected) return;
    setFlag(selected.id, { starred: !selFlags.starred });
    toast.success(selFlags.starred ? "Unstarred" : "Starred");
  }
  function snooze1h() {
    if (!selected) return;
    setFlag(selected.id, { snoozedUntil: Date.now() + 60 * 60 * 1000 });
    toast.success("Snoozed for 1 hour");
  }
  function archiveSelected() {
    if (!selected) return;
    setFlag(selected.id, { archived: true });
    toast.success("Archived");
  }
  function markRead() {
    if (!selected) return;
    setFlag(selected.id, { read: true });
    toast.success("Marked as read");
  }

  // Keyboard shortcuts: j/k navigate, s star, e archive, u snooze, r focus reply, / focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const editing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable;
      if (e.key === "/" && !editing) {
        e.preventDefault();
        (document.getElementById("inbox-search") as HTMLInputElement | null)?.focus();
        return;
      }
      if (editing) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = filtered.findIndex((t) => t.id === (selected?.id ?? ""));
      if (e.key === "j" && idx < filtered.length - 1) {
        setSelectedId(filtered[idx + 1].id);
      } else if (e.key === "k" && idx > 0) {
        setSelectedId(filtered[idx - 1].id);
      } else if (e.key === "s") {
        toggleStar();
      } else if (e.key === "e") {
        archiveSelected();
      } else if (e.key === "u") {
        snooze1h();
      } else if (e.key === "r") {
        e.preventDefault();
        document.getElementById("inbox-reply")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selected?.id, selFlags.starred]);



  async function handleSend() {
    if (!selected) return;
    if (!connected) {
      toast.success("Reply sent (demo — Instantly not connected)");
      return;
    }
    setSending(true);
    try {
      await callSendReply({
        data: {
          replyToId: selected.id,
          eaccount: selected.mailbox,
          subject: selected.subject.startsWith("Re:") ? selected.subject : `Re: ${selected.subject}`,
          body: reply || aiReplies[selected.id] || "",
        },
      });
      toast.success("Reply sent via Instantly");
      setReply("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="grid h-[calc(100dvh-3rem)] grid-cols-1 md:grid-cols-[280px_1fr] xl:grid-cols-[220px_320px_1fr]"
      data-reader={mobileReaderOpen ? "open" : "closed"}
    >
      {/* Mailboxes column — only on xl+ (hidden below to save space) */}
      <aside className="hidden flex-col border-r border-border/60 bg-muted/20 xl:flex">
        <div className="border-b border-border/60 p-3">
          <div
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            aria-label={connected ? "Connected to Instantly, live data" : "Not connected to Instantly"}
          >
            <Plug aria-hidden="true" className={cn("h-3 w-3", connected ? "text-emerald-500" : "text-amber-500")} />
            {connected ? "Instantly · live" : threadsQuery.isLoading ? "Connecting…" : "Demo data"}
          </div>
          {!connected && threadsQuery.data?.error && (
            <div className="mt-1 text-[10px] text-rose-500/80" title={threadsQuery.data.error}>
              {threadsQuery.data.error.slice(0, 60)}
            </div>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-0.5 p-2">
            {mailboxes.map((mb) => {
              const active = mailbox === mb.id;
              const count =
                mb.id === "all"
                  ? activeThreads.length
                  : activeThreads.filter((t) => t.mailbox === mb.id).length;
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

      {/* Thread list — full-width on mobile, hidden when reader is open on mobile */}
      <section
        className={cn(
          "flex-col border-r border-border/60 md:flex",
          mobileReaderOpen ? "hidden" : "flex",
        )}
      >
        <div className="flex items-center gap-2 border-b border-border/60 p-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="inbox-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search replies…  (press /)"
              className="h-8 pl-8"
              aria-label="Search replies"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={filter === "all" ? "ghost" : "secondary"}
                size="icon"
                className="h-8 w-8"
                aria-label="Filter threads"
                title="Filter threads"
              >
                <Filter className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setFilter("all")}>All</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setFilter("unread")}>Unread only</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setFilter("starred")}>Starred only</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ScrollArea className="flex-1">
          <div>
            {filtered.map((t) => (
              <ThreadRow
                key={t.id}
                thread={t}
                active={selected?.id === t.id}
                onClick={() => selectThread(t.id)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                <InboxIcon className="h-6 w-6 opacity-40" aria-hidden="true" />
                <p>{search || filter !== "all" ? "No threads match your filters." : "Inbox is empty."}</p>
                {(search || filter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleStar}
                  aria-label={selFlags.starred ? "Unstar" : "Star"}
                  aria-pressed={!!selFlags.starred}
                  title="Star (S)"
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      selFlags.starred && "fill-amber-400 text-amber-500",
                    )}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={snooze1h}
                  aria-label="Snooze 1 hour"
                  title="Snooze 1h (U)"
                >
                  <Clock className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={archiveSelected}
                  aria-label="Archive thread"
                  title="Archive (E)"
                >
                  <Archive className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={markRead}
                  aria-label="Mark as read"
                  title="Mark as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
              </div>

            </div>

            <ScrollArea className="flex-1">
              <div className="mx-auto max-w-3xl space-y-4 p-6">
                <div className="rounded-xl border border-brand/30 bg-gradient-to-br from-brand/10 to-transparent p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-brand">
                    <Sparkles className="h-3.5 w-3.5" /> AI summary
                    <button
                      disabled={loadingSummary}
                      onClick={async () => {
                        setLoadingSummary(true);
                        try {
                          const { summary } = await callSummarize({
                            data: {
                              from: selected.from.email,
                              company: selected.from.company,
                              subject: selected.subject,
                              body: selected.body,
                            },
                          });
                          setAiSummaries((s) => ({ ...s, [selected.id]: summary }));
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "AI summary failed");
                        } finally {
                          setLoadingSummary(false);
                        }
                      }}
                      className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline disabled:opacity-50"
                    >
                      {loadingSummary ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Re-analyze
                    </button>
                  </div>
                  <p className="mt-1.5 text-sm text-foreground/90">
                    {aiSummaries[selected.id] ?? selected.aiSummary}
                  </p>
                </div>

                <AiInsightPanel
                  threadId={selected.id}
                  from={selected.from.name}
                  fromEmail={selected.from.email}
                  company={selected.from.company}
                  subject={selected.subject}
                  body={selected.body}
                />



                <div className="rounded-xl border border-border/70 bg-background p-5">
                  <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{selected.receivedAt}</span>
                    <span>To {selected.mailbox}</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                    {selected.body}
                  </pre>
                </div>

                <div className="rounded-xl border border-border/70 bg-card">
                  <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2 text-xs font-semibold text-muted-foreground">
                    <Bot className="h-3.5 w-3.5 text-brand" /> Reply
                    {selected.suggestedReply && (
                      <button
                        onClick={() =>
                          setReply(aiReplies[selected.id] ?? selected.suggestedReply)
                        }
                        className="ml-auto text-[11px] font-medium text-brand hover:underline"
                      >
                        Use draft
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    <Textarea
                      id="inbox-reply"
                      aria-label="Reply body"
                      value={
                        reply || aiReplies[selected.id] || selected.suggestedReply || ""
                      }
                      onChange={(e) => setReply(e.target.value)}
                      rows={6}
                      placeholder="Write your reply, or hit Regenerate for an AI draft…"
                      className="resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Sparkles className="h-3 w-3" /> Tone: warm · Length: brief
                        {connected && (
                          <span className="ml-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                            Send via {selected.mailbox}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loadingReply}
                          onClick={async () => {
                            setLoadingReply(true);
                            try {
                              const { text } = await callGenerateReply({
                                data: {
                                  from: selected.from.email,
                                  company: selected.from.company,
                                  subject: selected.subject,
                                  body: selected.body,
                                  tone: "warm",
                                  length: "brief",
                                },
                              });
                              setAiReplies((r) => ({ ...r, [selected.id]: text }));
                              setReply(text);
                              toast.success("Fresh draft ready");
                            } catch (e) {
                              toast.error(
                                e instanceof Error ? e.message : "AI reply failed",
                              );
                            } finally {
                              setLoadingReply(false);
                            }
                          }}
                        >
                          {loadingReply ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Reply className="h-3.5 w-3.5" />
                          )}
                          Regenerate
                        </Button>
                        <Button size="sm" disabled={sending} onClick={handleSend}>
                          {sending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Send reply
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

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
