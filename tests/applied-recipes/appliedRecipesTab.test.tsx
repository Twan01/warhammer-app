/**
 * AR-04 -- AppliedRecipesTab tests.
 * Covers: assignment cards with recipe names, empty state CTA, onApplyRecipe callback, delete with 3 fields.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppliedRecipesTab } from "@/features/units/AppliedRecipesTab";
import type { RecipeAssignment } from "@/types/recipeAssignment";
import type { PaintingRecipe } from "@/types/recipe";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockAssignments: RecipeAssignment[] = [
  { id: 1, unit_id: 10, recipe_id: 100, created_at: "2026-01-01" },
  { id: 2, unit_id: 10, recipe_id: 200, created_at: "2026-01-02" },
];

const mockRecipes: PaintingRecipe[] = [
  {
    id: 100, name: "Gold Trim", faction_id: null, unit_id: null,
    area: null, primer: null, basecoat: null, shade: null, layer: null,
    highlight: null, glaze_filter: null, weathering: null, technical: null,
    basing: null, notes: null, tutorial_link: null, style: null, surface: null,
    effect: null, difficulty: null, estimated_minutes: null, result_photo_path: null,
    created_at: "2026-01-01", updated_at: "2026-01-01",
  },
  {
    id: 200, name: "Dark Cloak", faction_id: null, unit_id: null,
    area: null, primer: null, basecoat: null, shade: null, layer: null,
    highlight: null, glaze_filter: null, weathering: null, technical: null,
    basing: null, notes: null, tutorial_link: null, style: null, surface: null,
    effect: null, difficulty: null, estimated_minutes: null, result_photo_path: null,
    created_at: "2026-01-01", updated_at: "2026-01-01",
  },
];

const mockDeleteMutate = vi.fn();

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let currentAssignments = mockAssignments;

vi.mock("@/hooks/useRecipeAssignments", () => ({
  useAssignmentsByUnit: () => ({ data: currentAssignments, isLoading: false }),
  useDeleteAssignment: () => ({ mutate: mockDeleteMutate, isPending: false }),
}));

vi.mock("@/hooks/useRecipes", () => ({
  useRecipes: () => ({ data: mockRecipes }),
}));

// Mock AssignmentChecklist as a simple div (isolated testing)
vi.mock("@/features/recipes/AssignmentChecklist", () => ({
  AssignmentChecklist: ({ recipeId }: { recipeId: number }) => (
    <div data-testid={`checklist-${recipeId}`}>Checklist</div>
  ),
}));

// Tauri mocks
vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn().mockResolvedValue("/mock/app/data"),
  join: vi.fn().mockImplementation((...parts: string[]) => parts.join("/")),
}));
vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn().mockImplementation((path: string) => `asset://${path}`),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AppliedRecipesTab", () => {
  const mockOnApplyRecipe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    currentAssignments = mockAssignments;
  });

  it("renders assignment cards with recipe names", () => {
    render(
      <AppliedRecipesTab unitId={10} onApplyRecipe={mockOnApplyRecipe} />,
    );

    expect(screen.getByText("Gold Trim")).toBeInTheDocument();
    expect(screen.getByText("Dark Cloak")).toBeInTheDocument();
    expect(screen.getByTestId("checklist-100")).toBeInTheDocument();
    expect(screen.getByTestId("checklist-200")).toBeInTheDocument();
  });

  it("shows empty state with CTA when no assignments", () => {
    currentAssignments = [];

    render(
      <AppliedRecipesTab unitId={10} onApplyRecipe={mockOnApplyRecipe} />,
    );

    expect(screen.getByText("No recipes applied yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /apply recipe/i })).toBeInTheDocument();
  });

  it("calls onApplyRecipe when CTA clicked", async () => {
    currentAssignments = [];
    const user = userEvent.setup();

    render(
      <AppliedRecipesTab unitId={10} onApplyRecipe={mockOnApplyRecipe} />,
    );

    await user.click(screen.getByRole("button", { name: /apply recipe/i }));
    expect(mockOnApplyRecipe).toHaveBeenCalledTimes(1);
  });

  it("calls deleteAssignment with all 3 fields", async () => {
    const user = userEvent.setup();

    render(
      <AppliedRecipesTab unitId={10} onApplyRecipe={mockOnApplyRecipe} />,
    );

    // Click the first delete button
    const deleteButtons = screen.getAllByRole("button", { name: /remove/i });
    await user.click(deleteButtons[0]);

    expect(mockDeleteMutate).toHaveBeenCalledWith(
      { id: 1, unitId: 10, recipeId: 100 },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });
});
