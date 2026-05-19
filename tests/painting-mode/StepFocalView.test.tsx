/**
 * Phase 85-03 -- StepFocalView component tests.
 *
 * Pure presentational component: all data via props, no hook mocking needed.
 * Covers SE-01 (step detail), SE-02 (mark done), SE-03 (navigation),
 * SE-04 (position indicator), SE-05 (reference photo).
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepFocalView, type StepFocalViewProps } from "@/features/painting-mode/StepFocalView";
import type { RecipeStep } from "@/types/recipePaint";
import type { Paint } from "@/types/paint";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

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
    goPrev: vi.fn(),
    goNext: vi.fn(),
    canGoPrev: true,
    canGoNext: true,
    currentIndex: 2,
    totalSteps: 7,
    sectionName: "Basecoat",
    isAllComplete: false,
    ...overrides,
  };
  return { ...render(<StepFocalView {...defaultProps} />), props: defaultProps };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StepFocalView", () => {
  it("renders step name text (SE-01)", () => {
    renderFocalView();
    expect(screen.getByTestId("step-name")).toHaveTextContent("Apply base coat");
  });

  it("renders paint swatch with backgroundColor style (SE-01)", () => {
    renderFocalView();
    const swatch = screen.getByTestId("paint-swatch");
    expect(swatch).toBeInTheDocument();
    expect(swatch).toHaveStyle({ backgroundColor: "#231f20" });
  });

  it("renders paint name and brand info (SE-01)", () => {
    renderFocalView();
    expect(screen.getByText("Abaddon Black")).toBeInTheDocument();
    // Brand and type shown together
    expect(screen.getByText(/Citadel/)).toBeInTheDocument();
  });

  it("renders metadata row fields: technique, tool, dilution, time (SE-01)", () => {
    renderFocalView();
    expect(screen.getByText("brush")).toBeInTheDocument();
    expect(screen.getByText("Size 1 brush")).toBeInTheDocument();
    expect(screen.getByText("thin")).toBeInTheDocument();
    expect(screen.getByText("~15m")).toBeInTheDocument();
  });

  it("renders reference photo when stepPhotoUrl provided (SE-05)", () => {
    renderFocalView({ stepPhotoUrl: "asset://photo.jpg" });
    const photo = screen.getByTestId("step-photo");
    expect(photo).toBeInTheDocument();
    expect(photo).toHaveAttribute("src", "asset://photo.jpg");
  });

  it("does not render photo element when stepPhotoUrl is undefined (SE-05)", () => {
    renderFocalView({ stepPhotoUrl: undefined });
    expect(screen.queryByTestId("step-photo")).not.toBeInTheDocument();
  });

  it("renders position indicator 'Step X of Y' with section name (SE-04)", () => {
    renderFocalView({ currentIndex: 2, totalSteps: 7, sectionName: "Basecoat" });
    const indicator = screen.getByTestId("position-indicator");
    expect(indicator).toHaveTextContent("Step 3 of 7");
    expect(indicator).toHaveTextContent("Basecoat");
  });

  it("omits section name from position indicator when null (SE-04)", () => {
    renderFocalView({ sectionName: null });
    const indicator = screen.getByTestId("position-indicator");
    expect(indicator).toHaveTextContent("Step 3 of 7");
    expect(indicator.textContent).not.toContain("·");
  });

  it("Previous button disabled when canGoPrev is false (SE-03)", () => {
    renderFocalView({ canGoPrev: false });
    expect(screen.getByLabelText("Previous step")).toBeDisabled();
  });

  it("Previous button enabled and calls goPrev when clicked (SE-03)", async () => {
    const user = userEvent.setup();
    const { props } = renderFocalView({ canGoPrev: true });
    await user.click(screen.getByLabelText("Previous step"));
    expect(props.goPrev).toHaveBeenCalledOnce();
  });

  it("Next button disabled when canGoNext is false (SE-03)", () => {
    renderFocalView({ canGoNext: false });
    expect(screen.getByLabelText("Next step")).toBeDisabled();
  });

  it("Next button enabled and calls goNext when clicked (SE-03)", async () => {
    const user = userEvent.setup();
    const { props } = renderFocalView({ canGoNext: true });
    await user.click(screen.getByLabelText("Next step"));
    expect(props.goNext).toHaveBeenCalledOnce();
  });

  it("calls onMarkDone when Mark Done button clicked (SE-02)", async () => {
    const user = userEvent.setup();
    const { props } = renderFocalView();
    await user.click(screen.getByTestId("mark-done-btn"));
    expect(props.onMarkDone).toHaveBeenCalledOnce();
  });

  it("Mark Done button disabled when isCompleted is true", () => {
    renderFocalView({ isCompleted: true });
    expect(screen.getByTestId("mark-done-btn")).toBeDisabled();
  });

  it("paintless step shows '(no paint)' text, no swatch element", () => {
    renderFocalView({
      currentStep: makeStep({ paint_id: null }),
      paint: undefined,
    });
    expect(screen.getByText("(no paint)")).toBeInTheDocument();
    expect(screen.queryByTestId("paint-swatch")).not.toBeInTheDocument();
  });

  it("D-10: renders kbd badges for keyboard shortcuts", () => {
    renderFocalView();

    const kbdElements = document.querySelectorAll("kbd");
    expect(kbdElements.length).toBe(3);

    const kbdTexts = Array.from(kbdElements).map((el) => el.textContent);
    expect(kbdTexts).toContain("←"); // left arrow
    expect(kbdTexts).toContain("→"); // right arrow
    expect(kbdTexts).toContain("Space");
  });

  it("renders 'All steps complete!' state when isAllComplete", () => {
    renderFocalView({ isAllComplete: true });
    expect(screen.getByText("All steps complete!")).toBeInTheDocument();
    expect(screen.queryByTestId("mark-done-btn")).not.toBeInTheDocument();
  });
});
