/**
 * Phase 76 — PV-03 gap: MatchStatusIndicator component tests.
 *
 * Verifies that the indicator renders the correct icon color class for each
 * MatchStatus value (confirmed / auto / manual / null / ambiguous) and
 * calls onClick when the button is clicked.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MatchStatusIndicator } from "@/features/army-lists/MatchStatusIndicator";
import type { MatchStatus } from "@/types/unitRulesMapping";

function renderIndicator(
  matchStatus: MatchStatus | null,
  options: { ambiguousCount?: number; onClick?: () => void } = {},
) {
  const onClick = options.onClick ?? vi.fn();
  render(
    <TooltipProvider>
      <MatchStatusIndicator
        matchStatus={matchStatus}
        ambiguousCount={options.ambiguousCount}
        onClick={onClick}
      />
    </TooltipProvider>,
  );
  return { onClick };
}

describe("MatchStatusIndicator", () => {
  // ---------------------------------------------------------------------------
  // Confirmed state
  // ---------------------------------------------------------------------------

  it("renders text-emerald-500 icon class for confirmed status", () => {
    renderIndicator("confirmed");
    // The icon SVG element carries the color class from the config
    const icon = document.querySelector(".text-emerald-500");
    expect(icon).not.toBeNull();
  });

  it("confirmed state button has aria-label indicating mapping confirmed", () => {
    renderIndicator("confirmed");
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toMatch(/confirmed/i);
  });

  // ---------------------------------------------------------------------------
  // Auto state
  // ---------------------------------------------------------------------------

  it("renders text-muted-foreground icon class for auto status", () => {
    renderIndicator("auto");
    const icon = document.querySelector(".text-muted-foreground");
    expect(icon).not.toBeNull();
  });

  it("auto state button has aria-label indicating auto-matched", () => {
    renderIndicator("auto");
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toMatch(/auto/i);
  });

  // ---------------------------------------------------------------------------
  // Manual state
  // ---------------------------------------------------------------------------

  it("renders text-blue-500 icon class for manual status", () => {
    renderIndicator("manual");
    const icon = document.querySelector(".text-blue-500");
    expect(icon).not.toBeNull();
  });

  it("manual state button has aria-label indicating manually mapped", () => {
    renderIndicator("manual");
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toMatch(/manual/i);
  });

  // ---------------------------------------------------------------------------
  // Null state (no mapping)
  // ---------------------------------------------------------------------------

  it("renders text-amber-500 icon class when matchStatus is null", () => {
    renderIndicator(null);
    const icon = document.querySelector(".text-amber-500");
    expect(icon).not.toBeNull();
  });

  it("null state button has aria-label indicating no mapping", () => {
    renderIndicator(null);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toMatch(/no rules mapping/i);
  });

  // ---------------------------------------------------------------------------
  // Ambiguous state (ambiguousCount > 1, matchStatus auto or null)
  // ---------------------------------------------------------------------------

  it("renders text-destructive icon class when ambiguousCount > 1 and status is auto", () => {
    renderIndicator("auto", { ambiguousCount: 3 });
    const icon = document.querySelector(".text-destructive");
    expect(icon).not.toBeNull();
  });

  it("renders text-destructive icon class when ambiguousCount > 1 and status is null", () => {
    renderIndicator(null, { ambiguousCount: 2 });
    const icon = document.querySelector(".text-destructive");
    expect(icon).not.toBeNull();
  });

  it("does NOT render destructive color when ambiguousCount is 1", () => {
    renderIndicator("auto", { ambiguousCount: 1 });
    // Should fall through to the auto state (muted-foreground), NOT destructive
    const destructiveIcon = document.querySelector(".text-destructive");
    expect(destructiveIcon).toBeNull();
    const mutedIcon = document.querySelector(".text-muted-foreground");
    expect(mutedIcon).not.toBeNull();
  });

  it("ambiguous state button has aria-label mentioning ambiguous/candidates", () => {
    renderIndicator("auto", { ambiguousCount: 3 });
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toMatch(/ambiguous/i);
  });

  // ---------------------------------------------------------------------------
  // onClick — must be called when button is clicked
  // ---------------------------------------------------------------------------

  it("calls onClick when the button is clicked for confirmed status", () => {
    const { onClick } = renderIndicator("confirmed");
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick when the button is clicked for null status", () => {
    const { onClick } = renderIndicator(null);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick when the button is clicked for ambiguous status", () => {
    const { onClick } = renderIndicator("auto", { ambiguousCount: 5 });
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Button variant — must be ghost + icon size
  // ---------------------------------------------------------------------------

  it("button has h-6 and w-6 size classes", () => {
    renderIndicator("auto");
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("h-6");
    expect(btn.className).toContain("w-6");
  });
});
