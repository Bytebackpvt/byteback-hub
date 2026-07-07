import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOUR_KEY = "byteback-tour-completed";

type Step = {
  selector: string;
  title: string;
  body: string;
  route?: string;
};

const STEPS: Step[] = [
  {
    selector: '[data-tour="nav-dashboard"]',
    route: "/app",
    title: "Dashboard",
    body: "Your daily command center — priority actions, hot leads, and reply stats at a glance.",
  },
  {
    selector: '[data-tour="nav-inbox"]',
    route: "/app/inbox",
    title: "Unified Inbox",
    body: "All replies from every connected mailbox in one place. AI auto-classifies each one (Interested, Objection, Booked, etc.).",
  },
  {
    selector: '[data-tour="nav-crm"]',
    route: "/app/crm",
    title: "Contacts (CRM)",
    body: "Every lead with score, status, last activity, and full history — no external CRM needed.",
  },
  {
    selector: '[data-tour="nav-pipeline"]',
    route: "/app/pipeline",
    title: "Pipeline",
    body: "Drag leads across stages: New → Engaged → Qualified → Booked → Won.",
  },
  {
    selector: '[data-tour="nav-tasks"]',
    route: "/app/tasks",
    title: "Tasks",
    body: "Auto-created follow-ups based on AI classification. Never forget to reply.",
  },
  {
    selector: '[data-tour="nav-analytics"]',
    route: "/app/analytics",
    title: "Analytics",
    body: "Reply rate, hot-lead trends, response time, and team performance.",
  },
  {
    selector: '[data-tour="nav-integrations"]',
    route: "/app/integrations",
    title: "Integrations",
    body: "Connect Instantly, Smartlead, Slack, Google Sheets, webhooks and more.",
  },
  {
    selector: '[data-tour="nav-notifications"]',
    route: "/app/notifications",
    title: "Notifications",
    body: "Real-time alerts for hot replies, escalations, and team mentions.",
  },
  {
    selector: '[data-tour="nav-help"]',
    route: "/app/help",
    title: "Help Center",
    body: "Download the product manual, browse FAQs, and re-run this tour anytime from here.",
  },
];

export function GuidedTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const navigate = useNavigate();
  const timerRef = useRef<number | null>(null);

  const step = STEPS[index];

  useEffect(() => {
    if (!open) return;
    setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || !step) return;
    if (step.route) {
      navigate({ to: step.route }).catch(() => {});
    }
  }, [open, step, navigate]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    let cancelled = false;
    const measure = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        if (!cancelled) timerRef.current = window.setTimeout(measure, 120);
        return;
      }
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      const r = el.getBoundingClientRect();
      setRect(r);
    };
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, step, index]);

  if (!open || typeof document === "undefined") return null;

  const complete = () => {
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {}
    onClose();
  };

  const next = () => {
    if (index >= STEPS.length - 1) return complete();
    setIndex((i) => i + 1);
  };
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  // Keyboard nav: Escape to close, ArrowRight/ArrowLeft to step
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        complete();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);


  const pad = 8;
  const box = rect
    ? {
        top: Math.max(rect.top - pad, 4),
        left: Math.max(rect.left - pad, 4),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  // Position tooltip below or above the highlight
  const tooltipStyle: React.CSSProperties = box
    ? (() => {
        const spaceBelow = window.innerHeight - (box.top + box.height);
        const below = spaceBelow > 200;
        const top = below ? box.top + box.height + 12 : Math.max(box.top - 12 - 180, 12);
        const left = Math.min(Math.max(box.left, 12), window.innerWidth - 360);
        return { top, left, width: 340 };
      })()
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 340 };

  return createPortal(
    <div
      className="fixed inset-0 z-[100]"
      aria-live="polite"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-tour-title"
    >
      {/* Dimmed backdrop with a cutout using 4 rectangles */}
      {box ? (
        <>
          <button
            type="button"
            aria-label="Skip tour"
            className="absolute inset-x-0 top-0 bg-black/60"
            style={{ height: box.top }}
            onClick={complete}
          />
          <button
            type="button"
            aria-label="Skip tour"
            className="absolute left-0 bg-black/60"
            style={{ top: box.top, height: box.height, width: box.left }}
            onClick={complete}
          />
          <button
            type="button"
            aria-label="Skip tour"
            className="absolute right-0 bg-black/60"
            style={{
              top: box.top,
              height: box.height,
              width: Math.max(window.innerWidth - (box.left + box.width), 0),
            }}
            onClick={complete}
          />
          <button
            type="button"
            aria-label="Skip tour"
            className="absolute inset-x-0 bg-black/60"
            style={{ top: box.top + box.height, bottom: 0 }}
            onClick={complete}
          />
          <div
            className="pointer-events-none absolute rounded-lg ring-2 ring-brand shadow-[0_0_0_4px_rgba(255,255,255,0.15)]"
            style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
          />
        </>
      ) : (
        <button
          type="button"
          aria-label="Skip tour"
          className="absolute inset-0 bg-black/60"
          onClick={complete}
        />
      )}

      <div
        className="absolute rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl focus:outline-none"
        style={tooltipStyle}
        tabIndex={-1}
        ref={(el) => el?.focus()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-brand">
              Step {index + 1} of {STEPS.length}
            </div>
            <h3 id="guided-tour-title" className="mt-1 text-sm font-semibold">{step.title}</h3>
          </div>
          <button
            onClick={complete}
            className="rounded p-1 text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={complete}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={prev} disabled={index === 0}>
              <ArrowLeft className="h-3 w-3" /> Back
            </Button>
            <Button size="sm" onClick={next}>
              {index === STEPS.length - 1 ? "Finish" : "Next"}
              {index < STEPS.length - 1 && <ArrowRight className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function useGuidedTour() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_KEY)) {
        const t = window.setTimeout(() => setOpen(true), 800);
        return () => window.clearTimeout(t);
      }
    } catch {}
  }, []);
  return {
    open,
    start: () => setOpen(true),
    close: () => setOpen(false),
    reset: () => {
      try {
        localStorage.removeItem(TOUR_KEY);
      } catch {}
      setOpen(true);
    },
  };
}
