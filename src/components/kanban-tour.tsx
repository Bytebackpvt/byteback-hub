import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, HelpCircle, X, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getUiPrefs, setUiPref } from "@/lib/user-prefs.functions";
import {
  KANBAN_TOUR_LOCAL_KEY,
  KANBAN_TOUR_PREF_KEY,
  KANBAN_TOUR_STEPS,
  handleTourKey,
  isLastStep,
  nextStepIndex,
  prevStepIndex,
  shouldAutoOpen,
  tooltipPosition,
} from "@/lib/kanban-tour";

const TOOLTIP_W = 340;
const TOOLTIP_H = 200;

function readLocal(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KANBAN_TOUR_LOCAL_KEY) === "1";
  } catch {
    return false;
  }
}
function writeLocal(v: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (v) window.localStorage.setItem(KANBAN_TOUR_LOCAL_KEY, "1");
    else window.localStorage.removeItem(KANBAN_TOUR_LOCAL_KEY);
  } catch {
    /* private mode */
  }
}

function findAnchor(step: (typeof KANBAN_TOUR_STEPS)[number]): HTMLElement | null {
  const selectors = [step.selector, ...(step.fallbackSelectors ?? [])];
  for (const sel of selectors) {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (el) return el;
  }
  return null;
}

export function KanbanTour() {
  const qc = useQueryClient();
  const callGet = useServerFn(getUiPrefs);
  const callSet = useServerFn(setUiPref);

  const prefsQuery = useQuery({
    queryKey: ["ui-prefs"],
    queryFn: () => callGet(),
    staleTime: 5 * 60_000,
  });

  const savedPref = (() => {
    const p = prefsQuery.data?.prefs;
    if (!p || typeof p !== "object" || Array.isArray(p)) return undefined;
    const v = (p as Record<string, unknown>)[KANBAN_TOUR_PREF_KEY];
    return typeof v === "boolean" ? v : undefined;
  })();

  const setPrefMutation = useMutation({
    mutationFn: (dismissed: boolean) =>
      callSet({ data: { key: KANBAN_TOUR_PREF_KEY, value: dismissed } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ui-prefs"] }),
  });

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const autoOpenedRef = useRef(false);

  // Auto-open once per session on first visit.
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (prefsQuery.isLoading) return;
    const should = shouldAutoOpen({
      serverDismissed: savedPref ?? null,
      localDismissed: readLocal(),
    });
    if (should) {
      autoOpenedRef.current = true;
      const t = window.setTimeout(() => setOpen(true), 500);
      return () => window.clearTimeout(t);
    }
    autoOpenedRef.current = true;
  }, [prefsQuery.isLoading, savedPref]);

  // Track anchor position for the active step.
  useLayoutEffect(() => {
    if (!open) return;
    let cancelled = false;
    let timer: number | undefined;
    const measure = () => {
      const el = findAnchor(KANBAN_TOUR_STEPS[index]);
      if (!el) {
        if (!cancelled) timer = window.setTimeout(measure, 120);
        return;
      }
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      setRect(el.getBoundingClientRect());
    };
    measure();
    const onResize = () => {
      const el = findAnchor(KANBAN_TOUR_STEPS[index]);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, index]);

  const dismiss = useCallback(
    (persist: boolean) => {
      setOpen(false);
      if (persist) {
        writeLocal(true);
        setPrefMutation.mutate(true);
      }
      // Restore focus to the invoking button.
      if (lastFocusRef.current && typeof lastFocusRef.current.focus === "function") {
        try {
          lastFocusRef.current.focus();
        } catch {
          /* noop */
        }
      }
    },
    [setPrefMutation],
  );

  const next = useCallback(() => {
    if (isLastStep(index)) return dismiss(true);
    setIndex((i) => nextStepIndex(i));
  }, [index, dismiss]);
  const prev = useCallback(() => setIndex((i) => prevStepIndex(i)), []);

  // Focus trap + keyboard navigation.
  useEffect(() => {
    if (!open) return;
    lastFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const t = window.setTimeout(() => {
      const el = tooltipRef.current?.querySelector<HTMLElement>(
        "[data-tour-primary]",
      );
      el?.focus();
    }, 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const focusables = tooltipRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      const r = handleTourKey(e, { index });
      if (!r.handled) return;
      e.preventDefault();
      if (r.close) return dismiss(true);
      setIndex(r.index);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, index, dismiss]);

  const restart = () => {
    writeLocal(false);
    setPrefMutation.mutate(false);
    setIndex(0);
    setOpen(true);
  };

  const step = KANBAN_TOUR_STEPS[index];
  const titleId = `kanban-tour-title-${index}`;
  const bodyId = `kanban-tour-body-${index}`;

  const box = rect
    ? {
        top: Math.max(rect.top - 6, 4),
        left: Math.max(rect.left - 6, 4),
        width: rect.width + 12,
        height: rect.height + 12,
      }
    : null;

  const pos =
    open && box && typeof window !== "undefined"
      ? tooltipPosition({
          anchor: box,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          tooltip: { width: TOOLTIP_W, height: TOOLTIP_H },
        })
      : null;

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        aria-label="Open Kanban board help"
        title="Kanban help"
        onClick={restart}
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
      </Button>

      {open && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100]"
            role="presentation"
            aria-live="polite"
          >
            {box ? (
              <>
                <div
                  className="absolute inset-x-0 top-0 bg-black/55"
                  style={{ height: box.top }}
                  onClick={() => dismiss(true)}
                  aria-hidden="true"
                />
                <div
                  className="absolute left-0 bg-black/55"
                  style={{ top: box.top, height: box.height, width: box.left }}
                  onClick={() => dismiss(true)}
                  aria-hidden="true"
                />
                <div
                  className="absolute right-0 bg-black/55"
                  style={{
                    top: box.top,
                    height: box.height,
                    width: Math.max(window.innerWidth - (box.left + box.width), 0),
                  }}
                  onClick={() => dismiss(true)}
                  aria-hidden="true"
                />
                <div
                  className="absolute inset-x-0 bg-black/55"
                  style={{ top: box.top + box.height, bottom: 0 }}
                  onClick={() => dismiss(true)}
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute rounded-lg ring-2 ring-brand shadow-[0_0_0_4px_rgba(255,255,255,0.15)]"
                  style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
                  aria-hidden="true"
                />
              </>
            ) : (
              <div
                className="absolute inset-0 bg-black/55"
                onClick={() => dismiss(true)}
                aria-hidden="true"
              />
            )}

            <div
              ref={tooltipRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={bodyId}
              className="absolute rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl outline-none"
              style={
                pos
                  ? { top: pos.top, left: pos.left, width: TOOLTIP_W }
                  : { top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: TOOLTIP_W }
              }
              tabIndex={-1}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-brand">
                    <Zap className="h-3 w-3" aria-hidden="true" />
                    Step {index + 1} of {KANBAN_TOUR_STEPS.length}
                  </div>
                  <h3 id={titleId} className="mt-1 text-sm font-semibold">
                    {step.title}
                  </h3>
                </div>
                <button
                  onClick={() => dismiss(true)}
                  className="rounded p-1 text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  aria-label="Close Kanban tour"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p id={bodyId} className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {step.body}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => dismiss(true)}
                  className="text-[11px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
                >
                  Skip
                </button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prev}
                    disabled={index === 0}
                    aria-label="Previous step"
                  >
                    <ArrowLeft className="h-3 w-3" aria-hidden="true" /> Back
                  </Button>
                  <Button
                    size="sm"
                    onClick={next}
                    data-tour-primary
                    aria-label={isLastStep(index) ? "Finish tour" : "Next step"}
                  >
                    {isLastStep(index) ? "Got it" : "Next"}
                    {!isLastStep(index) && (
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground/70">
                Tip: use ← → to navigate, Esc to close.
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
