/**
 * AR-03 -- AssignmentChecklist component tests.
 *
 * Covers:
 * - D-06: Sectioned accordion with checkboxes
 * - D-07: Step checkboxes calling useToggleStepProgress
 * - D-08: Progress bar with completion percentage
 * - D-09: Flat recipe fallback (no accordion)
 * - Strikethrough styling on completed steps
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssignmentChecklist } from "@/features/recipes/AssignmentChecklist";
import type { RecipeAssignment, StepProgress } from "@/types/recipeAssignment";

// ---------------------------------------------------------------------------
// Mock variables (declared before vi.mock hoisting)
// ---------------------------------------------------------------------------

const mockToggleMutate = vi.fn();
let mockStepProgress: StepProgress[] = [];
let mockSections: { id: number; name: string }[] = [];
let mockSteps: { id: number; order_index: number; section_id: number | null; step_name: string }[] = [];
let mockProgress = {
  total: 3,
  completed: 1,
  percentage: 33,
  bySectionId: new Map<number | null, { total: number; completed: number }>([
    [1, { total: 2, completed: 1 }],
    [2, { total: 1, completed: 0 }],
  ]),
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useRecipeAssignments", () => ({
  useStepProgress: () => ({ data: mockStepProgress }),
  useToggleStepProgress: () => ({ mutate: mockToggleMutate, isPending: false }),
}));

vi.mock("@/hooks/useRecipePaints", () => ({
  useRecipePaints: () => ({ data: mockSteps }),
}));

vi.mock("@/hooks/useRecipeSections", () => ({
  useRecipeSections: () => ({ data: mockSections }),
}));

vi.mock("@/lib/computeAssignmentProgress", () => ({
  computeAssignmentProgress: () => mockProgress,
}));

vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn().mockResolvedValue("/mock/app/data"),
  join: vi.fn().mockImplementation((...parts: string[]) => parts.join("/")),
}));

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn().mockImplementation((path: string) => `asset://${path}`),
}));

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

function makeAssignment(over: Partial<RecipeAssignment> = {}): RecipeAssignment {
  return {
    id: 1,
    unit_id: 1,
    recipe_id: 1,
    created_at: "2026-01-01",
    ...over,
  };
}

function makeStepProgress(over: Partial<StepProgress> = {}): StepProgress {
  return {
    id: 1,
    assignment_id: 1,
    recipe_step_id: 0,
    completed: 0,
    completed_at: null,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockToggleMutate.mockClear();

  // Default: 3 steps, 2 in section 1, 1 in section 2
  mockSteps = [
    { id: 100, order_index: 0, section_id: 1, step_name: "Base Silver" },
    { id: 101, order_index: 1, section_id: 1, step_name: "Wash Nuln Oil" },
    { id: 102, order_index: 2, section_id: 2, step_name: "Edge Highlight" },
  ];

  mockSections = [
    { id: 1, name: "Basecoat" },
    { id: 2, name: "Wash" },
  ];

  mockStepProgress = [
    makeStepProgress({ id: 1, recipe_step_id: 100, completed: 1 }),
    makeStepProgress({ id: 2, recipe_step_id: 101, completed: 0 }),
    makeStepProgress({ id: 3, recipe_step_id: 102, completed: 0 }),
  ];

  mockProgress = {
    total: 3,
    completed: 1,
    percentage: 33,
    bySectionId: new Map<number | null, { total: number; completed: number }>([
      [1, { total: 2, completed: 1 }],
      [2, { total: 1, completed: 0 }],
    ]),
  };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AssignmentChecklist", () => {
  it("renders progress bar with percentage", () => {
    render(
      <AssignmentChecklist assignment={makeAssignment()} recipeId={1} />,
    );

    expect(screen.getByText("33% complete")).toBeVisible();
  });

  it("renders section accordion headers with counts", () => {
    render(
      <AssignmentChecklist assignment={makeAssignment()} recipeId={1} />,
    );

    expect(screen.getByText("Basecoat")).toBeVisible();
    expect(screen.getByText("1/2")).toBeVisible();
    expect(screen.getByText("Wash")).toBeVisible();
    expect(screen.getByText("0/1")).toBeVisible();
  });

  it("calls toggleStep on checkbox click", async () => {
    const user = userEvent.setup();

    render(
      <AssignmentChecklist assignment={makeAssignment()} recipeId={1} />,
    );

    // Open the "Basecoat" accordion section to reveal checkboxes
    await user.click(screen.getByText("Basecoat"));

    // The first checkbox (Base Silver) is completed (checked).
    // Click it to toggle it off.
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);

    expect(mockToggleMutate).toHaveBeenCalledWith({
      assignmentId: 1,
      recipeStepId: 100,
      completed: false,
    });
  });

  it("renders flat list when no sections", () => {
    // Override: no sections
    mockSections = [];
    mockProgress = {
      total: 3,
      completed: 1,
      percentage: 33,
      bySectionId: new Map<number | null, { total: number; completed: number }>([
        [null, { total: 3, completed: 1 }],
      ]),
    };
    // Steps without section_id for flat render
    mockSteps = [
      { id: 200, order_index: 0, section_id: null, step_name: "Flat Step 1" },
      { id: 201, order_index: 1, section_id: null, step_name: "Flat Step 2" },
      { id: 202, order_index: 2, section_id: null, step_name: "Flat Step 3" },
    ];

    const { container } = render(
      <AssignmentChecklist assignment={makeAssignment()} recipeId={1} />,
    );

    // No accordion elements should be present
    expect(container.querySelector("[data-slot='accordion']")).toBeNull();

    // Step names should be visible
    expect(screen.getByText("Flat Step 1")).toBeVisible();
    expect(screen.getByText("Flat Step 2")).toBeVisible();
    expect(screen.getByText("Flat Step 3")).toBeVisible();
  });

  it("applies strikethrough to completed steps", async () => {
    const user = userEvent.setup();

    render(
      <AssignmentChecklist assignment={makeAssignment()} recipeId={1} />,
    );

    // Open the "Basecoat" accordion section to reveal step content
    await user.click(screen.getByText("Basecoat"));

    // "Base Silver" is order_index 0, completed=1 in mockStepProgress
    const completedStep = screen.getByText("Base Silver");
    expect(completedStep.className).toContain("line-through");
  });
});
