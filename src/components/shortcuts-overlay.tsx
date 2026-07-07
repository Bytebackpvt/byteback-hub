import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

type Shortcut = { keys: string[]; label: string };

const SHORTCUTS: { section: string; items: Shortcut[] }[] = [
  {
    section: "Global",
    items: [
      { keys: ["?"], label: "Show this cheat sheet" },
      { keys: ["Esc"], label: "Close dialogs / tour" },
    ],
  },
  {
    section: "Inbox",
    items: [
      { keys: ["/"], label: "Focus search" },
      { keys: ["j", "k"], label: "Next / previous thread" },
      { keys: ["s"], label: "Star / unstar" },
      { keys: ["e"], label: "Archive" },
      { keys: ["u"], label: "Snooze 1 hour" },
      { keys: ["r"], label: "Focus reply" },
    ],
  },
  {
    section: "Tour",
    items: [
      { keys: ["→"], label: "Next step" },
      { keys: ["←"], label: "Previous step" },
    ],
  },
];

export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      setOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" /> Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>Press <Kbd>?</Kbd> anytime to toggle this list.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {SHORTCUTS.map((group) => (
            <section key={group.section}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.section}
              </h3>
              <ul className="divide-y divide-border/50">
                {group.items.map((s) => (
                  <li key={s.label} className="flex items-center justify-between py-2 text-sm">
                    <span>{s.label}</span>
                    <span className="flex gap-1">
                      {s.keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-mono font-semibold text-foreground">
      {children}
    </kbd>
  );
}
