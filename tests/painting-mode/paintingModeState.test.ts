import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { RecipeStep } from "@/types/recipePaint";
import type { RecipeSection } from "@/types/recipeSection";
import type { StepProgress } from "@/types/recipeAssignment";

// Mock the three hooks that usePaintingModeState composes
const mockUseRecipePaints = vi.fn();
const mockUseRecipeSections = vi.fn();
const mockUseStepProgress = vi.fn();

vi.mock("@/hooks/useRecipePaints", () => ({
  useRecipePaints: (...args: unknown[]) => mockUseRecipePaints(...args),
}));

vi.mock("@/hooks/useRecipeSections", () => ({
  useRecipeSections: (...args: unknown[]) => mockUseRecipeSections(...args),
}));

vi.mock("@/hooks/useRecipeAssignments", () => ({
  useStepProgress: (...args: unknown[]) => mockUseStepProgress(...args),
}));

import { usePaintingModeState } from "@/hooks/usePaintingModeState";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeStep(id: number, sectionId: number | null, orderIndex: number): RecipeStep {
  return {
    id,
    recipe_id: 10,
    paint_id: null,
    step_name: `Step ${id}`,
    order_index: orderIndex,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
    section_id: sectionId,
    created_at: "2026-01-01",
  };
}

function makeSection(id: number, orderIndex: number): RecipeSection {
  return {
    id,
    recipe_id: 10,
    name: `Section ${id}`,
    surface: null,
    optional: 0,
    order_index: orderIndex,
    notes: null,
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  };
}

function makeProgress(recipeStepId: number, completed: 0 | 1): StepProgress {
  return {
    id: recipeStepId * 100,
    assignment_id: 1,
    recipe_step_id: recipeStepId,
    completed,
    completed_at: completed === 1 ? "2026-01-01T00:00:00Z" : null,
  };
}

function mockQueryResult<T>(data: T) {
  return { data, isLoading: false, isError: false, error: null };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("usePaintingModeState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sorts steps by section order_index then step order_index", () => {
    const sections = [makeSection(1, 1), makeSection(2, 0)];
    const steps = [
      makeStep(10, 1, 0),
      makeStep(11, 1, 1),
      makeStep(20, 2, 0),
      makeStep(21, 2, 1),
    ];
    const progress = steps.map((s) => makeProgress(s.id, 0));

    mockUseRecipePaints.mockReturnValue(mockQueryResult(steps));
    mockUseRecipeSections.mockReturnValue(mockQueryResult(sections));
    mockUseStepProgress.mockReturnValue(mockQueryResult(progress));

    const { result } = renderHook(() => usePaintingModeState(1, 10));

    // Section 2 (order=0) comes before Section 1 (order=1)
    expect(result.current.orderedSteps[0].id).toBe(20);
    expect(result.current.orderedSteps[1].id).toBe(21);
    expect(result.current.orderedSteps[2].id).toBe(10);
    expect(result.current.orderedSteps[3].id).toBe(11);
  });

  it("steps without section sort after all sectioned steps", () => {
    const sections = [makeSection(3, 0)];
    const steps = [makeStep(30, 3, 0), makeStep(99, null, 0)];
    const progress = steps.map((s) => makeProgress(s.id, 0));

    mockUseRecipePaints.mockReturnValue(mockQueryResult(steps));
    mockUseRecipeSections.mockReturnValue(mockQueryResult(sections));
    mockUseStepProgress.mockReturnValue(mockQueryResult(progress));

    const { result } = renderHook(() => usePaintingModeState(1, 10));

    expect(result.current.orderedSteps[0].id).toBe(30);
    expect(result.current.orderedSteps[1].id).toBe(99);
  });

  it("sets initial currentStepId to first incomplete step in section-aware order", () => {
    const sections = [makeSection(4, 0)];
    const steps = [makeStep(40, 4, 0), makeStep(41, 4, 1), makeStep(42, 4, 2)];
    const progress = [makeProgress(40, 1), makeProgress(41, 0), makeProgress(42, 0)];

    mockUseRecipePaints.mockReturnValue(mockQueryResult(steps));
    mockUseRecipeSections.mockReturnValue(mockQueryResult(sections));
    mockUseStepProgress.mockReturnValue(mockQueryResult(progress));

    const { result } = renderHook(() => usePaintingModeState(1, 10));

    expect(result.current.currentStepId).toBe(41);
  });

  it("sets currentStepId to last step when all are complete", () => {
    const sections = [makeSection(4, 0)];
    const steps = [makeStep(40, 4, 0), makeStep(41, 4, 1), makeStep(42, 4, 2)];
    const progress = [makeProgress(40, 1), makeProgress(41, 1), makeProgress(42, 1)];

    mockUseRecipePaints.mockReturnValue(mockQueryResult(steps));
    mockUseRecipeSections.mockReturnValue(mockQueryResult(sections));
    mockUseStepProgress.mockReturnValue(mockQueryResult(progress));

    const { result } = renderHook(() => usePaintingModeState(1, 10));

    expect(result.current.currentStepId).toBe(42);
  });

  it("goNext advances currentStepId to next ordered step", () => {
    const sections = [makeSection(4, 0)];
    const steps = [makeStep(40, 4, 0), makeStep(41, 4, 1), makeStep(42, 4, 2)];
    const progress = steps.map((s) => makeProgress(s.id, 0));

    mockUseRecipePaints.mockReturnValue(mockQueryResult(steps));
    mockUseRecipeSections.mockReturnValue(mockQueryResult(sections));
    mockUseStepProgress.mockReturnValue(mockQueryResult(progress));

    const { result } = renderHook(() => usePaintingModeState(1, 10));

    expect(result.current.currentStepId).toBe(40);

    act(() => {
      result.current.goNext();
    });

    expect(result.current.currentStepId).toBe(41);
  });

  it("goPrev moves currentStepId to previous ordered step", () => {
    const sections = [makeSection(4, 0)];
    const steps = [makeStep(40, 4, 0), makeStep(41, 4, 1), makeStep(42, 4, 2)];
    const progress = steps.map((s) => makeProgress(s.id, 0));

    mockUseRecipePaints.mockReturnValue(mockQueryResult(steps));
    mockUseRecipeSections.mockReturnValue(mockQueryResult(sections));
    mockUseStepProgress.mockReturnValue(mockQueryResult(progress));

    const { result } = renderHook(() => usePaintingModeState(1, 10));

    // Move to step 41 first
    act(() => {
      result.current.goNext();
    });
    expect(result.current.currentStepId).toBe(41);

    // Now go back
    act(() => {
      result.current.goPrev();
    });
    expect(result.current.currentStepId).toBe(40);
  });

  it("goNext at last step does not change currentStepId", () => {
    const sections = [makeSection(4, 0)];
    const steps = [makeStep(40, 4, 0), makeStep(41, 4, 1)];
    const progress = steps.map((s) => makeProgress(s.id, 0));

    mockUseRecipePaints.mockReturnValue(mockQueryResult(steps));
    mockUseRecipeSections.mockReturnValue(mockQueryResult(sections));
    mockUseStepProgress.mockReturnValue(mockQueryResult(progress));

    const { result } = renderHook(() => usePaintingModeState(1, 10));

    // Navigate to last step
    act(() => {
      result.current.goNext();
    });
    expect(result.current.currentStepId).toBe(41);

    // Try to go beyond â€” should be no-op
    act(() => {
      result.current.goNext();
    });
    expect(result.current.currentStepId).toBe(41);
  });

  it("goPrev at first step does not change currentStepId", () => {
    const sections = [makeSection(4, 0)];
    const steps = [makeStep(40, 4, 0), makeStep(41, 4, 1)];
    const progress = steps.map((s) => makeProgress(s.id, 0));

    mockUseRecipePaints.mockReturnValue(mockQueryResult(steps));
    mockUseRecipeSections.mockReturnValue(mockQueryResult(sections));
    mockUseStepProgress.mockReturnValue(mockQueryResult(progress));

    const { result } = renderHook(() => usePaintingModeState(1, 10));

    expect(result.current.currentStepId).toBe(40);

    // Try to go before first â€” should be no-op
    act(() => {
      result.current.goPrev();
    });
    expect(result.current.currentStepId).toBe(40);
  });

  it("goToStep sets currentStepId to arbitrary step", () => {
    const sections = [makeSection(4, 0)];
    const steps = [makeStep(40, 4, 0), makeStep(41, 4, 1), makeStep(42, 4, 2)];
    const progress = steps.map((s) => makeProgress(s.id, 0));

    mockUseRecipePaints.mockReturnValue(mockQueryResult(steps));
    mockUseRecipeSections.mockReturnValue(mockQueryResult(sections));
    mockUseStepProgress.mockReturnValue(mockQueryResult(progress));

    const { result } = renderHook(() => usePaintingModeState(1, 10));

    act(() => {
      result.current.goToStep(42);
    });

    expect(result.current.currentStepId).toBe(42);
  });

  it("canGoPrev is false at first step, canGoNext is false at last step", () => {
    const sections = [makeSection(4, 0)];
    const steps = [makeStep(40, 4, 0), makeStep(41, 4, 1)];
    const progress = steps.map((s) => makeProgress(s.id, 0));

    mockUseRecipePaints.mockReturnValue(mockQueryResult(steps));
    mockUseRecipeSections.mockReturnValue(mockQueryResult(sections));
    mockUseStepProgress.mockReturnValue(mockQueryResult(progress));

    const { result } = renderHook(() => usePaintingModeState(1, 10));

    // At first step
    expect(result.current.canGoPrev).toBe(false);
    expect(result.current.canGoNext).toBe(true);

    // Navigate to last step
    act(() => {
      result.current.goNext();
    });

    expect(result.current.canGoPrev).toBe(true);
    expect(result.current.canGoNext).toBe(false);
  });

  it("sectionProgressMap shows completed/total counts per section", () => {
    const sections = [makeSection(5, 0)];
    const steps = [makeStep(50, 5, 0), makeStep(51, 5, 1), makeStep(52, 5, 2)];
    const progress = [makeProgress(50, 1), makeProgress(51, 1), makeProgress(52, 0)];

    mockUseRecipePaints.mockReturnValue(mockQueryResult(steps));
    mockUseRecipeSections.mockReturnValue(mockQueryResult(sections));
    mockUseStepProgress.mockReturnValue(mockQueryResult(progress));

    const { result } = renderHook(() => usePaintingModeState(1, 10));

    const entry = result.current.sectionProgressMap.get(5);
    expect(entry).toBeDefined();
    expect(entry!.completed).toBe(2);
    expect(entry!.total).toBe(3);
  });
});
