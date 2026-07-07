import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Sparkles, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  listTasks,
  createTask,
  toggleTask,
  deleteTask,
  generateTasksFromThreads,
  type TaskRow,
} from "@/lib/tasks.functions";
import { listInstantlyThreads } from "@/lib/instantly.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/tasks")({
  component: TasksPage,
});

const PRIORITY: Record<TaskRow["priority"], string> = {
  high: "text-rose-500",
  med: "text-amber-500",
  low: "text-muted-foreground",
};

function formatDue(due: string | null) {
  if (!due) return "";
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return due;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function TasksPage() {
  const qc = useQueryClient();
  const fetchTasks = useServerFn(listTasks);
  const fetchThreads = useServerFn(listInstantlyThreads);
  const create = useServerFn(createTask);
  const toggle = useServerFn(toggleTask);
  const remove = useServerFn(deleteTask);
  const generate = useServerFn(generateTasksFromThreads);

  const tasksQ = useQuery({ queryKey: ["tasks"], queryFn: () => fetchTasks() });
  const threadsQ = useQuery({ queryKey: ["inbox"], queryFn: () => fetchThreads() });

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"high" | "med" | "low">("med");
  const [due, setDue] = useState("");

  const createMut = useMutation({
    mutationFn: (input: { title: string; priority: "high" | "med" | "low"; due: string }) =>
      create({
        data: {
          title: input.title,
          priority: input.priority,
          due: input.due || null,
          linkedTo: "",
        },
      }),
    onSuccess: () => {
      setTitle("");
      setDue("");
      setPriority("med");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (input: { id: string; done: boolean }) => toggle({ data: input }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueryData<{ tasks: TaskRow[] }>(["tasks"]);
      qc.setQueryData<{ tasks: TaskRow[] }>(["tasks"], (old) =>
        old
          ? {
              tasks: old.tasks.map((t) => (t.id === input.id ? { ...t, done: input.done } : t)),
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks"], ctx.prev);
      toast.error("Could not update task");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const generateMut = useMutation({
    mutationFn: async () => {
      const threads = threadsQ.data?.threads ?? [];
      const eligible = threads
        .filter((t) => !["ooo", "unsubscribe", "spam"].includes(t.category))
        .slice(0, 15)
        .map((t) => ({
          id: t.id,
          from: t.from.name,
          company: t.from.company,
          subject: t.subject,
          body: t.body,
          category: t.category,
        }));
      if (eligible.length === 0) throw new Error("No eligible inbox threads yet.");
      return generate({ data: { threads: eligible } });
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(r.created > 0 ? `${r.created} tasks generated` : "No new tasks — inbox is up to date");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMut.mutate({ title: title.trim(), priority, due });
  };

  const tasks = tasksQ.data?.tasks ?? [];
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div className="mx-auto h-[calc(100dvh-3rem)] max-w-3xl overflow-y-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-xs text-muted-foreground">
            Follow-ups from your inbox — synced to your workspace.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => generateMut.mutate()}
          disabled={generateMut.isPending || threadsQ.isLoading}
        >
          {generateMut.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Generate from inbox
        </Button>
      </div>

      <form
        onSubmit={submit}
        className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card p-3"
      >
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          className="min-w-[200px] flex-1"
          aria-label="New task title"
        />

        <Input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="w-[150px]"
        />
        <Select value={priority} onValueChange={(v) => setPriority(v as "high" | "med" | "low")}>
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="med">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" disabled={!title.trim() || createMut.isPending}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </form>

      {tasksQ.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : tasksQ.isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load tasks.
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <p>No tasks yet.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => document.getElementById("task-title")?.focus()}
            >
              <Plus className="h-3.5 w-3.5" /> Add a task
            </Button>
            <Button
              size="sm"
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending || threadsQ.isLoading}
            >
              {generateMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate from inbox
            </Button>
          </div>
        </div>

      ) : (
        <>
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Open ({open.length})
            </h2>
            <div className="space-y-1.5">
              {open.map((t) => (
                <TaskRowView
                  key={t.id}
                  task={t}
                  onToggle={() => toggleMut.mutate({ id: t.id, done: !t.done })}
                  onDelete={() => deleteMut.mutate(t.id)}
                />
              ))}
            </div>
          </section>

          {done.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Completed
              </h2>
              <div className="space-y-1.5 opacity-60">
                {done.map((t) => (
                  <TaskRowView
                    key={t.id}
                    task={t}
                    onToggle={() => toggleMut.mutate({ id: t.id, done: !t.done })}
                    onDelete={() => deleteMut.mutate(t.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function TaskRowView({
  task,
  onToggle,
  onDelete,
}: {
  task: TaskRow;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 transition hover:border-border">
      <Checkbox checked={task.done} onCheckedChange={onToggle} />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-sm",
            task.done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className={PRIORITY[task.priority]}>● {task.priority}</span>
          {task.linked_to && (
            <>
              <span>·</span>
              <span className="truncate">{task.linked_to}</span>
            </>
          )}
          {task.source === "ai" && (
            <Badge variant="outline" className="h-4 px-1 text-[9px]">
              <Sparkles className="mr-0.5 h-2.5 w-2.5" /> AI
            </Badge>
          )}
        </div>
      </div>
      <div className="text-xs font-medium text-muted-foreground">{formatDue(task.due)}</div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 transition group-hover:opacity-100"
        onClick={onDelete}
        aria-label="Delete task"
        title="Delete task"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
