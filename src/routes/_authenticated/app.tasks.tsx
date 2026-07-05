import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TASKS, type Task } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/tasks")({
  component: TasksPage,
});

const PRIORITY: Record<Task["priority"], string> = {
  high: "text-rose-500",
  med: "text-amber-500",
  low: "text-muted-foreground",
};

function TasksPage() {
  const [tasks, setTasks] = useState(TASKS);
  const toggle = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div className="mx-auto h-[calc(100vh-3rem)] max-w-3xl overflow-y-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-xs text-muted-foreground">
            AI-suggested follow-ups from your conversations.
          </p>
        </div>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5" /> New task
        </Button>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Open ({open.length})
        </h2>
        <div className="space-y-1.5">
          {open.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={() => toggle(t.id)} />
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
              <TaskRow key={t.id} task={t} onToggle={() => toggle(t.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 transition hover:border-border">
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
          <span>·</span>
          <span>{task.linkedTo}</span>
        </div>
      </div>
      <div className="text-xs font-medium text-muted-foreground">{task.due}</div>
    </div>
  );
}
