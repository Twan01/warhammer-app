/**
 * Phase 86-02 -- PaintingModePage keyboard shortcut tests.
 *
 * Covers PX-02 (Space mark done), PX-03 (Arrow nav), PX-04 (Escape exit),
 * PX-05 (shortcuts disabled on input focus), loading/render states.
 *
 * Uses fireEvent.keyDown on document.body because react-hotkeys-hook
 * registers listeners on the document, not individual elements.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RecipeStep } from "@/types/recipePaint";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
const mockMutate = vi.fn();
const mockGoPrev = vi.fn();
const mockGoNext = vi.fn();
const mockGoToStep = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ assignmentId: "1" }),
  useNavigate: () => mockNavigate,
}));

vi.mock("@/hooks/useRecipeAssignments", () => ({
  useRecipeAssignment: () => ({
    data: { id: 1, unit_id: 10, recipe_id: 20, created_at: "2026-01-01" },
    isLoading: false,
  }),
  useCompleteStep: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

let mockStateOverrides: Record<string, unknown> = {};

function makeStep(overrides: Partial<RecipeStep> = {}): RecipeStep {
  return {
    id: 1,
    recipe_id: 20,
    paint_id: null,
    step_name: "Apply base",
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

const defaultMockStep = makeStep();

vi.mock("@/hooks/usePaintingModeState", () => ({
  usePaintingModeState: () => ({
    orderedSteps: [defaultMockStep],
    currentStepId: 1,
    currentIndex: 0,
    completedSet: new Set<number>(),
    isLoading: false,
    canGoPrev: false,
    canGoNext: true,
    goPrev: mockGoPrev,
    goNext: mockGoNext,
    goToStep: mockGoToStep,
    sectionProgressMap: new Map(),
    ...mockStateOverrides,
  }),
}));

vi.mock("@/hooks/useRecipeSections", () => ({
  useRecipeSections: () => ({ data: [] }),
}));

vi.mock("@/hooks/useUnits", () => ({
  useUnit: () => ({ data: { id: 10, name: "Intercessors" } }),
}));

vi.mock("@/hooks/useRecipes", () => ({
  useRecipe: () => ({ data: { id: 20, name: "Ultramarines Scheme" } }),
}));

vi.mock("@/lib/dates", () => ({
  todayISO: () => "2026-05-19",
}));

// Mock PaintingModeView as a simple div so keyboard events bubble from document
vi.mock("@/features/painting-mode/PaintingModeView", () => ({
  PaintingModeView: () => <div data-testid="painting-mode-view">View</div>,
}));

vi.mock("@/features/painting-mode/PaintingSessionSheet", () => ({
  PaintingSessionSheet: () => null,
}));

import { PaintingModePage } from "@/app/painting-mode/page";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PaintingModePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStateOverrides = {};
  });

  it("renders PaintingModeView when assignment loads", () => {
    render(<PaintingModePage />);
    expect(screen.getByTestId("painting-mode-view")).toBeInTheDocument();
  });

  it("PX-02: Space key calls mark done handler", () => {
    render(<PaintingModePage />);

    fireEvent.keyDown(document, { key: " ", code: "Space" });
    expect(mockMutate).toHaveBeenCalled();
  });

  it("PX-03: ArrowRight calls goNext", () => {
    render(<PaintingModePage />);

    fireEvent.keyDown(document, { key: "ArrowRight", code: "ArrowRight" });
    expect(mockGoNext).toHaveBeenCalled();
  });

  it("PX-03: ArrowLeft calls goPrev", () => {
    mockStateOverrides = { canGoPrev: true };
    render(<PaintingModePage />);

    fireEvent.keyDown(document, { key: "ArrowLeft", code: "ArrowLeft" });
    expect(mockGoPrev).toHaveBeenCalled();
  });

  it("PX-04: Escape calls navigate", () => {
    render(<PaintingModePage />);

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(mockNavigate).toHaveBeenCalled();
  });

  it("PX-05: Shortcuts disabled when input focused", async () => {
    const user = userEvent.setup();

    function PageWithInput() {
      return (
        <div>
          <input data-testid="test-input" />
          <PaintingModePage />
        </div>
      );
    }

    render(<PageWithInput />);
    const input = screen.getByTestId("test-input");
    await user.click(input);

    // Dispatch keydown on the focused input element
    fireEvent.keyDown(input, { key: " ", code: "Space" });

    // react-hotkeys-hook disables shortcuts when form inputs are focused by default
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
