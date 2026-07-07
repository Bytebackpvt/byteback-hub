import { describe, it, expect } from "vitest";
import {
  KANBAN_TOUR_STEPS,
  handleTourKey,
  isLastStep,
  nextStepIndex,
  prevStepIndex,
  shouldAutoOpen,
  tooltipPosition,
} from "./kanban-tour";

describe("kanban tour step definitions", () => {
  it("anchors to real column, card, and advance-button data-tour hooks", () => {
    const selectors = KANBAN_TOUR_STEPS.map((s) => s.selector);
    expect(selectors).toEqual([
      '[data-tour="kanban-column"]',
      '[data-tour="kanban-card"]',
      '[data-tour="kanban-advance"]',
    ]);
  });

  it("every step provides a title and body used by aria-labelledby / describedby", () => {
    for (const step of KANBAN_TOUR_STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
    }
  });
});

describe("step navigation helpers", () => {
  it("clamps next/prev to the range", () => {
    expect(nextStepIndex(0)).toBe(1);
    expect(nextStepIndex(2)).toBe(2);
    expect(prevStepIndex(0)).toBe(0);
    expect(prevStepIndex(2)).toBe(1);
  });
  it("identifies the last step", () => {
    expect(isLastStep(2)).toBe(true);
    expect(isLastStep(1)).toBe(false);
  });
});

describe("shouldAutoOpen", () => {
  it("suppresses when server pref says dismissed", () => {
    expect(shouldAutoOpen({ serverDismissed: true, localDismissed: false })).toBe(false);
  });
  it("opens when server pref explicitly says not dismissed, even if local said seen", () => {
    expect(shouldAutoOpen({ serverDismissed: false, localDismissed: true })).toBe(true);
  });
  it("falls back to local flag when server pref is unknown", () => {
    expect(shouldAutoOpen({ serverDismissed: null, localDismissed: false })).toBe(true);
    expect(shouldAutoOpen({ serverDismissed: undefined, localDismissed: true })).toBe(false);
  });
});

describe("tooltipPosition", () => {
  const viewport = { width: 1024, height: 768 };
  const tooltip = { width: 320, height: 180 };
  it("places below the anchor when there is room", () => {
    const pos = tooltipPosition({
      anchor: { top: 100, left: 200, width: 260, height: 80 },
      viewport,
      tooltip,
    });
    expect(pos.placement).toBe("below");
    expect(pos.top).toBeGreaterThan(180);
    expect(pos.left).toBe(200);
  });
  it("flips above when there is no room below", () => {
    const pos = tooltipPosition({
      anchor: { top: 700, left: 10, width: 200, height: 60 },
      viewport,
      tooltip,
    });
    expect(pos.placement).toBe("above");
    expect(pos.top).toBeLessThan(700);
  });
  it("clamps horizontally so the tooltip stays in viewport", () => {
    const pos = tooltipPosition({
      anchor: { top: 100, left: 950, width: 60, height: 40 },
      viewport,
      tooltip,
    });
    expect(pos.left + tooltip.width).toBeLessThanOrEqual(viewport.width);
  });
});

describe("handleTourKey (keyboard nav)", () => {
  it("Escape signals close", () => {
    const r = handleTourKey({ key: "Escape" }, { index: 1 });
    expect(r).toEqual({ index: 1, close: true, handled: true });
  });
  it("ArrowRight advances, ArrowLeft goes back", () => {
    expect(handleTourKey({ key: "ArrowRight" }, { index: 0 }).index).toBe(1);
    expect(handleTourKey({ key: "ArrowLeft" }, { index: 2 }).index).toBe(1);
  });
  it("Home / End jump to first / last", () => {
    expect(handleTourKey({ key: "Home" }, { index: 2 }).index).toBe(0);
    expect(handleTourKey({ key: "End" }, { index: 0 }).index).toBe(2);
  });
  it("returns handled=false for unrelated keys", () => {
    expect(handleTourKey({ key: "a" }, { index: 0 }).handled).toBe(false);
  });
});
