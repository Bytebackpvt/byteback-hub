import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Flame,
  Loader2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  classifyEmail,
  CATEGORY_LABELS,
  NEXT_ACTION_LABELS,
  type ClassifyResult,
} from "@/lib/classify.functions";
import {
  listAiEvents,
  logAiEvent,
  submitAiFeedback,
} from "@/lib/timeline.functions";
import { cn } from "@/lib/utils";

type Props = {
  threadId: string;
  from: string;
  fromEmail: string;
  company: string;
  subject: string;
  body: string;
};

export function AiInsightPanel({ threadId, from, fromEmail, company, subject, body }: Props) {
  const qc = useQueryClient();
  const callClassify = useServerFn(classifyEmail);
  const callLog = useServerFn(logAiEvent);
  const callFeedback = useServerFn(submitAiFeedback);
  const callListEvents = useServerFn(listAiEvents);

  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<"accepted" | "rejected" | null>(null);

  const eventsQuery = useQuery({
    queryKey: ["ai-events", threadId],
    queryFn: () => callListEvents({ data: { threadId } }),
    staleTime: 30_000,
  });

  const alreadyClassified = useMemo(() => {
    const events = eventsQuery.data?.events ?? [];
    return events.find((e) => e.event_type === "classified");
  }, [eventsQuery.data]);

  useEffect(() => {
    // Reset when thread changes
    setResult(null);
    setVerdict(null);
    setLoading(false);
  }, [threadId]);

  useEffect(() => {
    // Hydrate from existing timeline event
    if (result || loading) return;
    if (!alreadyClassified) return;
    const meta = (alreadyClassified.meta ?? {}) as Record<string, unknown>;
    setResult({
      category: (alreadyClassified.category as ClassifyResult["category"]) ?? "unknown",
      confidence: Number(alreadyClassified.confidence ?? 0) || 0,
      reason: String(alreadyClassified.reason ?? ""),
      next_action:
        (alreadyClassified.next_action as ClassifyResult["next_action"]) ?? "wait",
      next_action_reason: String(meta.next_action_reason ?? ""),
      priority: (meta.priority as ClassifyResult["priority"]) ?? "cold",
      signals: Array.isArray(meta.signals) ? (meta.signals as string[]) : [],
    });
  }, [alreadyClassified, result, loading]);

  const analyze = async () => {
    setLoading(true);
    try {
      const r = await callClassify({
        data: { from: fromEmail || from, company, subject, body },
      });
      setResult(r);
      await callLog({
        data: {
          threadId,
          leadEmail: fromEmail,
          eventType: "classified",
          title: `AI classified as ${CATEGORY_LABELS[r.category]}`,
          detail: r.reason,
          category: r.category,
          confidence: r.confidence,
          nextAction: r.next_action,
          reason: r.reason,
          meta: {
            priority: r.priority,
            signals: r.signals,
            next_action_reason: r.next_action_reason,
          },
        },
      });
      qc.invalidateQueries({ queryKey: ["ai-events", threadId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI classification failed");
    } finally {
      setLoading(false);
    }
  };

  const feedbackMut = useMutation({
    mutationFn: async (v: "accepted" | "rejected") => {
      if (!result) return;
      await callFeedback({
        data: {
          threadId,
          suggestionType: "classification",
          suggestionValue: `${result.category}|${result.next_action}`,
          verdict: v,
        },
      });
      setVerdict(v);
    },
    onSuccess: (_d, v) => {
      toast.success(v === "accepted" ? "Marked as correct" : "Feedback noted — AI will learn");
      qc.invalidateQueries({ queryKey: ["ai-events", threadId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Feedback failed"),
  });

  const priorityStyle: Record<ClassifyResult["priority"], string> = {
    hot: "bg-red-500/15 text-red-500 border-red-500/30",
    warm: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    cold: "bg-slate-500/15 text-slate-500 border-slate-500/30",
  };

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand" />
          <span className="text-sm font-medium">AI Insight</span>
        </div>
        {!result && (
          <Button size="sm" variant="secondary" disabled={loading} onClick={analyze}>
            {loading ? (
              <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Analyzing…</>
            ) : (
              "Analyze"
            )}
          </Button>
        )}
        {result && (
          <Button size="sm" variant="ghost" disabled={loading} onClick={analyze}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Re-analyze"}
          </Button>
        )}
      </div>

      {result && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-semibold">
              {CATEGORY_LABELS[result.category]}
            </Badge>
            <Badge className={cn("border", priorityStyle[result.priority])}>
              {result.priority === "hot" && <Flame className="mr-1 h-3 w-3" />}
              {result.priority.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {Math.round(result.confidence * 100)}% confidence
            </span>
          </div>

          <div className="text-sm">
            <div className="text-xs font-medium text-muted-foreground">Why?</div>
            <p className="text-sm">{result.reason}</p>
          </div>

          {result.signals.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {result.signals.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] text-brand"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          <div className="rounded-md border bg-muted/40 p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3 w-3 text-brand" />
                <span className="font-medium">Suggested next action:</span>
                <span>{NEXT_ACTION_LABELS[result.next_action]}</span>
              </div>
            </div>
            {result.next_action_reason && (
              <p className="mt-1 text-xs text-muted-foreground">{result.next_action_reason}</p>
            )}
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant={verdict === "accepted" ? "default" : "outline"}
                onClick={() => feedbackMut.mutate("accepted")}
                disabled={feedbackMut.isPending}
              >
                <ThumbsUp className="mr-1 h-3 w-3" /> Accept
              </Button>
              <Button
                size="sm"
                variant={verdict === "rejected" ? "destructive" : "outline"}
                onClick={() => feedbackMut.mutate("rejected")}
                disabled={feedbackMut.isPending}
              >
                <ThumbsDown className="mr-1 h-3 w-3" /> Reject
              </Button>
            </div>
          </div>

          {result.priority === "hot" && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 p-2 text-xs">
              <AlertTriangle className="mt-0.5 h-3 w-3 text-red-500" />
              <div>
                <div className="font-medium text-red-600">Why is this lead Hot?</div>
                <div className="text-muted-foreground">{result.reason}</div>
              </div>
            </div>
          )}
        </div>
      )}

      <AiTimeline events={eventsQuery.data?.events ?? []} />
    </div>
  );
}

type EventRow = {
  id: string;
  event_type: string;
  title: string;
  detail: string | null;
  created_at: string;
};

function AiTimeline({ events }: { events: EventRow[] }) {
  if (!events.length) return null;
  return (
    <div className="mt-4 border-t pt-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">AI Timeline</div>
      <ol className="space-y-2">
        {events.slice(0, 10).map((e) => (
          <li key={e.id} className="flex gap-2 text-xs">
            <TimelineIcon type={e.event_type} />
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{e.title}</span>
                <span className="whitespace-nowrap text-muted-foreground">
                  {new Date(e.created_at).toLocaleString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              {e.detail && <div className="text-muted-foreground">{e.detail}</div>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TimelineIcon({ type }: { type: string }) {
  const cls = "mt-0.5 h-3 w-3";
  if (type === "classified") return <Sparkles className={cn(cls, "text-brand")} />;
  if (type === "reply_sent") return <Check className={cls + " text-emerald-500"} />;
  if (type === "escalated") return <Flame className={cn(cls, "text-red-500")} />;
  if (type === "reminder_created") return <Clock className={cn(cls, "text-amber-500")} />;
  if (type === "feedback") return <ThumbsUp className={cn(cls, "text-brand")} />;
  return <X className={cn(cls, "text-muted-foreground opacity-0")} />;
}
