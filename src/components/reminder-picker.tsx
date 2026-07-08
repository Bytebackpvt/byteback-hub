import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Calendar, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTask } from "@/lib/tasks.functions";

type Preset = "1h" | "3h" | "tomorrow" | "nextweek" | "custom" | "none";

function computeDue(preset: Preset, custom: string): string | null {
  const d = new Date();
  if (preset === "1h") {
    d.setHours(d.getHours() + 1);
  } else if (preset === "3h") {
    d.setHours(d.getHours() + 3);
  } else if (preset === "tomorrow") {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
  } else if (preset === "nextweek") {
    d.setDate(d.getDate() + 7);
    d.setHours(9, 0, 0, 0);
  } else if (preset === "custom") {
    if (!custom) return null;
    return custom.length === 10 ? custom : new Date(custom).toISOString().slice(0, 10);
  } else {
    return null;
  }
  // tasks.due is a DATE column — snap to YYYY-MM-DD.
  return d.toISOString().slice(0, 10);
}

const PRESETS: { value: Preset; label: string; hint: string }[] = [
  { value: "1h", label: "In 1 hour", hint: "Quick nudge" },
  { value: "3h", label: "In 3 hours", hint: "Later today" },
  { value: "tomorrow", label: "Tomorrow 9am", hint: "Fresh morning" },
  { value: "nextweek", label: "Next week", hint: "Long tail" },
];

export type ReminderPickerProps = {
  trigger?: React.ReactNode;
  defaultTitle?: string;
  linkedTo?: string;
  threadId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onScheduled?: () => void;
};

export function ReminderPicker({
  trigger,
  defaultTitle = "Follow up",
  linkedTo = "",
  threadId = null,
  open,
  onOpenChange,
  onScheduled,
}: ReminderPickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = open !== undefined;
  const isOpen = controlled ? open : internalOpen;
  const setOpen = (v: boolean) => {
    if (!controlled) setInternalOpen(v);
    onOpenChange?.(v);
  };

  const [title, setTitle] = useState(defaultTitle);
  const [preset, setPreset] = useState<Preset>("tomorrow");
  const [custom, setCustom] = useState("");
  const [priority, setPriority] = useState<"high" | "med" | "low">("med");

  const qc = useQueryClient();
  const call = useServerFn(createTask);
  const mut = useMutation({
    mutationFn: () => {
      const due = computeDue(preset, custom);
      return call({
        data: {
          title: title.trim() || defaultTitle,
          due,
          priority,
          linkedTo,
          source: "manual",
          threadId,
        },
      });
    },
    onSuccess: () => {
      toast.success("Reminder scheduled", {
        description:
          preset === "custom" && custom
            ? `On ${custom}`
            : PRESETS.find((p) => p.value === preset)?.label ?? "No due date",
      });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard-tasks"] });
      onScheduled?.();
      setOpen(false);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger !== undefined && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Remind me about this
          </DialogTitle>
          <DialogDescription>
            Creates a follow-up task so this lead never falls through the cracks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="rp-title">What should I remind you about?</Label>
            <Input
              id="rp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Reply to Priya about pricing"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>When?</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPreset(p.value)}
                  className={`rounded-lg border p-3 text-left text-sm transition ${
                    preset === p.value
                      ? "border-primary bg-primary/5"
                      : "border-border/70 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-3.5 w-3.5" /> {p.label}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{p.hint}</div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPreset("custom")}
                className={`col-span-2 rounded-lg border p-3 text-left text-sm transition ${
                  preset === "custom"
                    ? "border-primary bg-primary/5"
                    : "border-border/70 hover:border-border"
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  <Calendar className="h-3.5 w-3.5" /> Pick a date
                </div>
                {preset === "custom" && (
                  <Input
                    type="date"
                    className="mt-2 h-8"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                  />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rp-prio">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger id="rp-prio">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="med">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || (preset === "custom" && !custom)}
          >
            {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Schedule reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
