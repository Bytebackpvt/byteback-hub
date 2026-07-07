// Pure logic for the Kanban onboarding tour. Extracted so it can be
// unit-tested without a DOM. The component in
// src/components/kanban-tour.tsx is a thin wrapper over these helpers.

export type KanbanTourStep = {
  /** CSS selector for the element the tooltip should anchor to. */
  selector: string;
  /** Fallback selectors tried in order if the primary one is missing. */
  fallbackSelectors?: string[];
  /** aria-labelledby target inside the tooltip. */
  title: string;
  /** aria-describedby target inside the tooltip. */
  body: string;
};

export const KANBAN_TOUR_PREF_KEY = "kanban_tip_dismissed_v1";
export const KANBAN_TOUR_LOCAL_KEY = "byteback.kanban.tip.seen.v1";

export const KANBAN_TOUR_STEPS: KanbanTourStep[] = [
  {
    selector: '[data-tour="kanban-column"]',
    fallbackSelectors: ['[data-tour="kanban-board"]'],
    title: "Columns = stages",
    body: "Each column is one step of your pipeline (New → Interested → Meeting → Won). Customize them from Customize stages.",
  },
  {
    selector: '[data-tour="kanban-card"]',
    fallbackSelectors: ['[data-tour="kanban-column"]'],
    title: "Cards = leads",
    body: "Each card is one lead with name, company, and last activity. Hover a card to see the shortcut to the next stage.",
  },
  {
    selector: '[data-tour="kanban-advance"]',
    fallbackSelectors: ['[data-tour="kanban-card"]', '[data-tour="kanban-column"]'],
    title: "Move to progress",
    body: "Click the arrow to advance a lead. If the stage has automation, a follow-up task and notification fire instantly.",
  },
];

export function nextStepIndex(current: number, total = KANBAN_TOUR_STEPS.length) {
  return Math.min(current + 1, total - 1);
}

export function prevStepIndex(current: number) {
  return Math.max(current - 1, 0);
}

export function isLastStep(current: number, total = KANBAN_TOUR_STEPS.length) {
  return current >= total - 1;
}

/**
 * Decide whether the tour should auto-open on this visit. Server pref wins;
 * localStorage is only used as an offline / pre-auth fallback so the tour
 * doesn't flash for returning users before the server pref loads.
 */
export function shouldAutoOpen(input: {
  serverDismissed: boolean | null | undefined;
  localDismissed: boolean;
}) {
  if (input.serverDismissed === true) return false;
  if (input.serverDismissed === false) return true;
  // Server pref not yet loaded — trust local flag.
  return !input.localDismissed;
}

/**
 * Compute a tooltip position (top-left corner) given an anchor rect and
 * viewport dimensions. Places the tooltip below the anchor when there is
 * room, otherwise above; horizontally clamped inside the viewport.
 */
export function tooltipPosition(input: {
  anchor: { top: number; left: number; width: number; height: number };
  viewport: { width: number; height: number };
  tooltip: { width: number; height: number };
  margin?: number;
}) {
  const margin = input.margin ?? 12;
  const spaceBelow = input.viewport.height - (input.anchor.top + input.anchor.height);
  const placeBelow = spaceBelow >= input.tooltip.height + margin;
  const top = placeBelow
    ? input.anchor.top + input.anchor.height + margin
    : Math.max(input.anchor.top - input.tooltip.height - margin, margin);
  const rawLeft = input.anchor.left;
  const maxLeft = input.viewport.width - input.tooltip.width - margin;
  const left = Math.min(Math.max(rawLeft, margin), Math.max(margin, maxLeft));
  return { top, left, placement: placeBelow ? ("below" as const) : ("above" as const) };
}

/**
 * Reducer-style key handler for tour navigation. Returns the next state
 * plus whether the tour should close.
 */
export function handleTourKey(
  event: { key: string },
  state: { index: number },
  total = KANBAN_TOUR_STEPS.length,
): { index: number; close: boolean; handled: boolean } {
  switch (event.key) {
    case "Escape":
      return { index: state.index, close: true, handled: true };
    case "ArrowRight":
    case "PageDown":
      return { index: nextStepIndex(state.index, total), close: false, handled: true };
    case "ArrowLeft":
    case "PageUp":
      return { index: prevStepIndex(state.index), close: false, handled: true };
    case "Home":
      return { index: 0, close: false, handled: true };
    case "End":
      return { index: total - 1, close: false, handled: true };
    default:
      return { index: state.index, close: false, handled: false };
  }
}
