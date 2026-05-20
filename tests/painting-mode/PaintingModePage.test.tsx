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

// Mock PaintingModeView to expose callbacks for testing
vi.mock("@/features/painting-mode/PaintingModeView", () => ({
  PaintingModeView: (props: { onMarkDoneWithSession?: () => void }) => {
    return (
      <div data-testid="painting-mode-view">
        <button data-testid="trigger-session" onClick={props.onMarkDoneWithSession}>
          trigger session
        </button>
      </div>
    );
  },
}));

let capturedSessionSheetProps: Record<string, unknown> | null = null;
vi.mock("@/features/painting-mode/PaintingSessionSheet", () => ({
  PaintingSessionSheet: (props: Record<string, unknown>) => {
    capturedSessionSheetProps = props;
    return props.open ? <div data-testid="painting-session-sheet">Sheet</div> : null;
  },
}));

import { PaintingModePage } from "@/app/painting-mode/page";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PaintingModePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStateOverrides = {};
    capturedSessionSheetProps = null;
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

  it("SL-02: clicking Done + Log Session opens session sheet", async () => {
    const user = userEvent.setup();
    render(<PaintingModePage />);

    // Initially the sheet should not be open
    expect(screen.queryByTestId("painting-session-sheet")).not.toBeInTheDocument();

    // Click the trigger button which calls onMarkDoneWithSession -> setPaintingSessionOpen(true)
    await user.click(screen.getByTestId("trigger-session"));

    // Sheet should now render (open=true)
    expect(screen.getByTestId("painting-session-sheet")).toBeInTheDocument();
  });

  it("SL-02: session sheet receives correct context props", async () => {
    const user = userEvent.setup();
    render(<PaintingModePage />);

    // Trigger the sheet open
    await user.click(screen.getByTestId("trigger-session"));

    // Verify captured props include prefilled context
    expect(capturedSessionSheetProps).not.toBeNull();
    expect(capturedSessionSheetProps!.unitName).toBe("Intercessors");
    expect(capturedSessionSheetProps!.recipeName).toBe("Ultramarines Scheme");
    expect(capturedSessionSheetProps!.stepName).toBe("Apply base");
    expect(capturedSessionSheetProps!.open).toBe(true);
  });

  it("SL-02: session sheet onSubmit triggers completeMutation with duration/notes", async () => {
    const user = userEvent.setup();
    render(<PaintingModePage />);

    // Open the session sheet
    await user.click(screen.getByTestId("trigger-session"));

    // Now call onSubmit from the captured props (simulating form submission)
    const onSubmit = capturedSessionSheetProps!.onSubmit as (duration: number, notes: string | null) => void;
    onSubmit(45, "Good session");

    expect(mockMutate).toHaveBeenCalledOnce();
    // Verify the session payload includes duration and notes
    const callArgs = mockMutate.mock.calls[0][0];
    expect(callArgs.session.duration_minutes).toBe(45);
    expect(callArgs.session.notes).toBe("Good session");
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
