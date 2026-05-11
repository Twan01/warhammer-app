/**
 * Phase 55 Plan 01 — RuleAnnotationControls tests.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RuleAnnotationControls } from "@/features/rules-hub/RuleAnnotationControls";

function renderControls(overrides: Partial<React.ComponentProps<typeof RuleAnnotationControls>> = {}) {
  const defaults = {
    isFavorited: false,
    isReminder: false,
    hasNote: false,
    onToggleFavorite: vi.fn(),
    onToggleReminder: vi.fn(),
  };
  return render(<RuleAnnotationControls {...defaults} {...overrides} />);
}

describe("RuleAnnotationControls", () => {
  it("renders star button with unfavorited state (text-muted-foreground)", () => {
    renderControls({ isFavorited: false });
    const star = screen.getByRole("button", { name: "Add to favorites" });
    expect(star).toBeInTheDocument();
    // The SVG inside should not have fill-yellow-500
    expect(star.querySelector("svg")).not.toHaveClass("fill-yellow-500");
  });

  it("renders star button with favorited state (fill-yellow-500)", () => {
    renderControls({ isFavorited: true });
    const star = screen.getByRole("button", { name: "Remove from favorites" });
    expect(star).toBeInTheDocument();
    expect(star.querySelector("svg")).toHaveClass("fill-yellow-500");
  });

  it("renders flag button with inactive state (text-muted-foreground)", () => {
    renderControls({ isReminder: false });
    const flag = screen.getByRole("button", { name: "Set as Game Day reminder" });
    expect(flag).toBeInTheDocument();
    expect(flag.querySelector("svg")).not.toHaveClass("fill-blue-500");
  });

  it("renders flag button with active reminder state (fill-blue-500)", () => {
    renderControls({ isReminder: true });
    const flag = screen.getByRole("button", { name: "Remove Game Day reminder" });
    expect(flag).toBeInTheDocument();
    expect(flag.querySelector("svg")).toHaveClass("fill-blue-500");
  });

  it("shows StickyNote icon when hasNote=true", () => {
    renderControls({ hasNote: true });
    // StickyNote renders as an svg — check by its container being present
    const container = screen.getByRole("button", { name: /favorites/i }).parentElement;
    expect(container?.querySelectorAll("svg").length).toBeGreaterThanOrEqual(3);
  });

  it("hides StickyNote icon when hasNote=false", () => {
    renderControls({ hasNote: false });
    const container = screen.getByRole("button", { name: /favorites/i }).parentElement;
    // Only star + flag SVGs, no third one
    expect(container?.querySelectorAll("svg").length).toBe(2);
  });

  it("calls onToggleFavorite when star clicked", async () => {
    const onToggleFavorite = vi.fn();
    renderControls({ onToggleFavorite });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add to favorites" }));
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it("calls onToggleReminder when flag clicked", async () => {
    const onToggleReminder = vi.fn();
    renderControls({ onToggleReminder });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Set as Game Day reminder" }));
    expect(onToggleReminder).toHaveBeenCalledTimes(1);
  });
});
