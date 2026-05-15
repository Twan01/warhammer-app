/**
 * Phase 76 — PV-02 gap: PointsSourceChip component tests.
 *
 * Verifies that the chip renders the correct dot color class and text
 * for each of the 5 PointsSource values, and exposes the correct aria-label.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PointsSourceChip } from "@/features/army-lists/PointsSourceChip";
import type { PointsSource } from "@/lib/resolveUnitPoints";

function renderChip(points: number | null, source: PointsSource) {
  return render(
    <TooltipProvider>
      <PointsSourceChip points={points} source={source} />
    </TooltipProvider>,
  );
}

describe("PointsSourceChip", () => {
  // ---------------------------------------------------------------------------
  // Dot color classes — each source has a distinct bg- class
  // ---------------------------------------------------------------------------

  it("renders bg-emerald-500 dot for synced source", () => {
    renderChip(95, "synced");
    const dot = document.querySelector(".bg-emerald-500");
    expect(dot).not.toBeNull();
  });

  it("renders bg-violet-500 dot for override source", () => {
    renderChip(100, "override");
    const dot = document.querySelector(".bg-violet-500");
    expect(dot).not.toBeNull();
  });

  it("renders bg-amber-500 dot for user-override source", () => {
    renderChip(80, "user-override");
    const dot = document.querySelector(".bg-amber-500");
    expect(dot).not.toBeNull();
  });

  it("renders bg-blue-500 dot for base source", () => {
    renderChip(75, "base");
    const dot = document.querySelector(".bg-blue-500");
    expect(dot).not.toBeNull();
  });

  it("renders bg-muted-foreground/50 dot for unknown source", () => {
    renderChip(null, "unknown");
    // Tailwind generates the literal class name including the slash
    const dot = document.querySelector(".bg-muted-foreground\\/50");
    expect(dot).not.toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Text content — points and label
  // ---------------------------------------------------------------------------

  it("renders '<N> pts' text label for a known source", () => {
    renderChip(95, "synced");
    expect(screen.getByText("95 pts")).toBeInTheDocument();
  });

  it("renders '0 pts' text label when points is 0 and source is base", () => {
    renderChip(0, "base");
    expect(screen.getByText("0 pts")).toBeInTheDocument();
  });

  it("renders '--' instead of a number when source is unknown", () => {
    renderChip(null, "unknown");
    expect(screen.getByText("-- pts")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Aria-label — accessibility attribute must encode both value and source
  // ---------------------------------------------------------------------------

  it("aria-label contains points value and source name for synced", () => {
    renderChip(95, "synced");
    const wrapper = screen.getByLabelText(/95 points, source: synced/i);
    expect(wrapper).toBeInTheDocument();
  });

  it("aria-label contains points value and source name for override", () => {
    renderChip(100, "override");
    const wrapper = screen.getByLabelText(/100 points, source: override/i);
    expect(wrapper).toBeInTheDocument();
  });

  it("aria-label contains -- and source name for unknown", () => {
    renderChip(null, "unknown");
    const wrapper = screen.getByLabelText(/-- points, source: unknown/i);
    expect(wrapper).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Dot shape — must be a rounded-full span (per spec: h-1.5 w-1.5 rounded-full)
  // ---------------------------------------------------------------------------

  it("dot element has rounded-full class for all sources", () => {
    for (const source of ["synced", "override", "user-override", "base"] as PointsSource[]) {
      const { unmount } = renderChip(50, source);
      const dot = document.querySelector(".rounded-full");
      expect(dot, `rounded-full missing for source=${source}`).not.toBeNull();
      unmount();
    }
  });
});
