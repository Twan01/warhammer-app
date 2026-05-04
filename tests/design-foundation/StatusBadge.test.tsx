/**
 * Phase 25 (DSFD-04) — StatusBadge component and PAINTING_STATUS_TIER map tests.
 *
 * Tests verify the 4-tier dot color system described in 25-01-PLAN.md:
 * - All 11 PaintingStatus values render without error
 * - Correct dot color class applied per tier
 * - PAINTING_STATUS_TIER export covers all 11 statuses
 * - Tier boundaries: not-started / prep / painting / done
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge, PAINTING_STATUS_TIER } from "@/components/ui/status-badge";
import { PAINTING_STATUS_ORDER } from "@/types/unit";
import type { PaintingStatus } from "@/types/unit";

/** Helper: get the dot span (first child of the badge span). */
function getDotSpan(container: HTMLElement): Element {
  const badge = container.querySelector("span.inline-flex");
  expect(badge).not.toBeNull();
  return badge!.children[0];
}

describe("DSFD-04 — StatusBadge component", () => {
  describe("all 11 PaintingStatus values render", () => {
    PAINTING_STATUS_ORDER.forEach((status) => {
      it(`renders "${status}" without error`, () => {
        expect(() => render(<StatusBadge status={status} />)).not.toThrow();
        expect(screen.getByText(status)).toBeInTheDocument();
      });
    });
  });

  describe("tier 1 — not-started: bg-muted-foreground/50 dot", () => {
    it("'Not Started' renders with bg-muted-foreground/50 dot class", () => {
      const { container } = render(<StatusBadge status="Not Started" />);
      const dot = getDotSpan(container);
      expect(dot.className).toContain("bg-muted-foreground/50");
    });
  });

  describe("tier 2 — prep: bg-slate-400 dot", () => {
    const prepStatuses: PaintingStatus[] = ["Built", "Primed", "Basecoated"];
    prepStatuses.forEach((status) => {
      it(`"${status}" renders with bg-slate-400 dot class`, () => {
        const { container } = render(<StatusBadge status={status} />);
        const dot = getDotSpan(container);
        expect(dot.className).toContain("bg-slate-400");
      });
    });
  });

  describe("tier 3 — painting: bg-violet-400 dot", () => {
    const paintingStatuses: PaintingStatus[] = [
      "Shaded",
      "Layered",
      "Highlighted",
      "Details Done",
      "Based",
    ];
    paintingStatuses.forEach((status) => {
      it(`"${status}" renders with bg-violet-400 dot class`, () => {
        const { container } = render(<StatusBadge status={status} />);
        const dot = getDotSpan(container);
        expect(dot.className).toContain("bg-violet-400");
      });
    });
  });

  describe("tier 4 — done: bg-emerald-400 dot", () => {
    const doneStatuses: PaintingStatus[] = ["Varnished", "Completed"];
    doneStatuses.forEach((status) => {
      it(`"${status}" renders with bg-emerald-400 dot class`, () => {
        const { container } = render(<StatusBadge status={status} />);
        const dot = getDotSpan(container);
        expect(dot.className).toContain("bg-emerald-400");
      });
    });
  });
});

describe("DSFD-04 — PAINTING_STATUS_TIER export", () => {
  it("covers all 11 PaintingStatus values", () => {
    PAINTING_STATUS_ORDER.forEach((status) => {
      expect(PAINTING_STATUS_TIER).toHaveProperty(status);
    });
  });

  it("maps 'Not Started' to 'not-started' tier", () => {
    expect(PAINTING_STATUS_TIER["Not Started"]).toBe("not-started");
  });

  it("maps 'Built', 'Primed', 'Basecoated' to 'prep' tier", () => {
    expect(PAINTING_STATUS_TIER["Built"]).toBe("prep");
    expect(PAINTING_STATUS_TIER["Primed"]).toBe("prep");
    expect(PAINTING_STATUS_TIER["Basecoated"]).toBe("prep");
  });

  it("maps painting-in-progress statuses to 'painting' tier", () => {
    expect(PAINTING_STATUS_TIER["Shaded"]).toBe("painting");
    expect(PAINTING_STATUS_TIER["Layered"]).toBe("painting");
    expect(PAINTING_STATUS_TIER["Highlighted"]).toBe("painting");
    expect(PAINTING_STATUS_TIER["Details Done"]).toBe("painting");
    expect(PAINTING_STATUS_TIER["Based"]).toBe("painting");
  });

  it("maps 'Varnished' and 'Completed' to 'done' tier", () => {
    expect(PAINTING_STATUS_TIER["Varnished"]).toBe("done");
    expect(PAINTING_STATUS_TIER["Completed"]).toBe("done");
  });

  it("has exactly 11 entries (no extra or missing)", () => {
    expect(Object.keys(PAINTING_STATUS_TIER)).toHaveLength(11);
  });
});
