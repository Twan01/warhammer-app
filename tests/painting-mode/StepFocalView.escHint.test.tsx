/**
 * NAV-11 — StepFocalView "Esc to exit" hint visible in active step view.
 *
 * Behavior: the rendered active step view (non-complete state) shows the
 * text "Esc to exit" as a keyboard shortcut hint at the bottom.
 *
 * Mirrors tests/painting-mode/StepFocalView.test.tsx for props/fixture setup.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepFocalView, type StepFocalViewProps } from "@/features/painting-mode/StepFocalView";
import type { RecipeStep } from "@/types/recipePaint";
import type { Paint } from "@/types/paint";

function makeStep(overrides: Partial<RecipeStep> = {}): RecipeStep {
  return {
    id: 1,
    recipe_id: 10,
    paint_id: 10,
    step_name: "Apply base coat",
    order_index: 0,
    notes: null,
    painting_phase: "basecoat",
    tool: "Size 1 brush",
    technique: "brush",
    dilution: "thin",
    time_estimate_minutes: 15,
    step_photo_path: null,
    alt_paint_id: null,
    section_id: 100,
    created_at: "2026-01-01",
    ...overrides,
  };
}

function makePaint(overrides: Partial<Paint> = {}): Paint {
  return {
    id: 10,
    brand: "Citadel",
    name: "Abaddon Black",
    paint_type: "Base",
    color_family: null,
    hex_color: "#231f20",
    owned: 1,
    quantity: null,
    running_low: 0,
    wishlist: 0,
    notes: null,
    purchase_price_pence: null,
    purchase_date: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

function renderFocalView(overrides: Partial<StepFocalViewProps> = {}) {
  const defaultProps: StepFocalViewProps = {
    currentStep: makeStep(),
    paint: makePaint(),
    stepPhotoUrl: undefined,
    isCompleted: false,
    onMarkDone: vi.fn(),
    onMarkDoneWithSession: vi.fn(),
    goPrev: vi.fn(),
    goNext: vi.fn(),
    canGoPrev: true,
    canGoNext: true,
    currentIndex: 0,
    totalSteps: 5,
    sectionName: null,
    isAllComplete: false,
    ...overrides,
  };
  return render(<StepFocalView {...defaultProps} />);
}

describe("StepFocalView — NAV-11: Esc to exit hint", () => {
  it("renders 'Esc to exit' text in the active step view", () => {
    renderFocalView();
    expect(screen.getByText("Esc to exit")).toBeInTheDocument();
  });

  it("'Esc to exit' is visible in the step view regardless of step position", () => {
    renderFocalView({ currentIndex: 3, totalSteps: 7 });
    expect(screen.getByText("Esc to exit")).toBeInTheDocument();
  });

  it("'Esc to exit' is absent when isAllComplete (completion screen replaces step view)", () => {
    // The completion screen has its own hint "Press Escape to exit" (different text)
    // The active-step "Esc to exit" paragraph should NOT appear
    renderFocalView({ isAllComplete: true });
    expect(screen.queryByText("Esc to exit")).not.toBeInTheDocument();
  });
});
