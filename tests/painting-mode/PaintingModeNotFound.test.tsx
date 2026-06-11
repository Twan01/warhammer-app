/**
 * Phase 126 (FIX-02) -- PaintingModePage not-found screen tests.
 *
 * Verifies that when useRecipeAssignment returns no data (assignment not found),
 * the page renders a "Go Back" button with ArrowLeft and a "Press Escape to exit" hint.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { RecipeStep } from "@/types/recipePaint";

// ---------------------------------------------------------------------------
// Mocks — assignment NOT found
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ assignmentId: "999" }),
  useNavigate: () => mockNavigate,
}));

// Assignment returns undefined (not found)
vi.mock("@/hooks/useRecipeAssignments", () => ({
  useRecipeAssignment: () => ({
    data: undefined,
    isLoading: false,
  }),
  useCompleteStep: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

function makeStep(overrides: Partial<RecipeStep> = {}): RecipeStep {
  return {
    id: 1,
    recipe_id: 0,
    paint_id: null,
    step_name: "Stub",
    order_index: 0,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
    section_id: null,
    created_at: "2026-01-01",
    ...overrides,
  };
}

vi.mock("@/hooks/usePaintingModeState", () => ({
  usePaintingModeState: () => ({
    orderedSteps: [],
    currentStepId: null,
    currentIndex: 0,
    completedSet: new Set<number>(),
    isLoading: false,
    canGoPrev: false,
    canGoNext: false,
    goPrev: vi.fn(),
    goNext: vi.fn(),
    goToStep: vi.fn(),
    sectionProgressMap: new Map(),
  }),
}));

vi.mock("@/hooks/useRecipeSections", () => ({
  useRecipeSections: () => ({ data: [] }),
}));

vi.mock("@/hooks/useUnits", () => ({
  useUnit: () => ({ data: undefined }),
}));

vi.mock("@/hooks/useRecipes", () => ({
  useRecipe: () => ({ data: undefined }),
}));

vi.mock("@/lib/dates", () => ({
  todayISO: () => "2026-06-11",
}));

// Do NOT mock PaintingModeView — the not-found screen should appear before it
vi.mock("@/features/painting-mode/PaintingModeView", () => ({
  PaintingModeView: () => <div data-testid="painting-mode-view">should not render</div>,
}));

vi.mock("@/features/painting-mode/PaintingSessionSheet", () => ({
  PaintingSessionSheet: () => null,
}));

import { PaintingModePage } from "@/app/painting-mode/page";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PaintingModePage — assignment not found (FIX-02)", () => {
  it("renders 'Go Back' button when assignment is not found", () => {
    render(<PaintingModePage />);
    const backBtn = screen.getByRole("button", { name: /go back/i });
    expect(backBtn).toBeInTheDocument();
  });

  it("renders 'Assignment not found' heading", () => {
    render(<PaintingModePage />);
    expect(screen.getByText("Assignment not found")).toBeInTheDocument();
  });

  it("renders 'Press Escape to exit' hint", () => {
    render(<PaintingModePage />);
    expect(screen.getByText(/press escape to exit/i)).toBeInTheDocument();
  });

  it("does NOT render PaintingModeView when assignment is not found", () => {
    render(<PaintingModePage />);
    expect(screen.queryByTestId("painting-mode-view")).not.toBeInTheDocument();
  });
});
