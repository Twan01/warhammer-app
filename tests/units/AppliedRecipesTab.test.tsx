/**
 * Phase 87 EP-03 -- AppliedRecipesTab Paint button behavioral tests.
 *
 * Verifies:
 * - Renders Paint button per assignment with data-testid="paint-btn-{id}"
 * - Clicking Paint navigates to /painting-mode/$assignmentId
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/hooks/useRecipeAssignments", () => ({
  useAssignmentsByUnit: () => ({
    data: [
      { id: 100, unit_id: 1, recipe_id: 10, created_at: "2026-01-01" },
      { id: 200, unit_id: 1, recipe_id: 20, created_at: "2026-01-02" },
    ],
    isLoading: false,
  }),
  useDeleteAssignment: () => ({
    mutate: vi.fn(),
  }),
}));

vi.mock("@/hooks/useRecipes", () => ({
  useRecipes: () => ({
    data: [
      { id: 10, name: "Ultramarines Blue" },
      { id: 20, name: "Gold NMM" },
    ],
  }),
}));

// AssignmentChecklist uses hooks that call Tauri APIs -- stub it out
vi.mock("@/features/recipes/AssignmentChecklist", () => ({
  AssignmentChecklist: () => <div data-testid="assignment-checklist" />,
}));

import { AppliedRecipesTab } from "@/features/units/AppliedRecipesTab";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EP-03: AppliedRecipesTab Paint buttons", () => {
  it("renders Paint button per assignment with correct data-testid", () => {
    render(<AppliedRecipesTab unitId={1} onApplyRecipe={vi.fn()} />);

    expect(screen.getByTestId("paint-btn-100")).toBeInTheDocument();
    expect(screen.getByTestId("paint-btn-200")).toBeInTheDocument();
  });

  it("Paint button text says 'Paint'", () => {
    render(<AppliedRecipesTab unitId={1} onApplyRecipe={vi.fn()} />);

    expect(screen.getByTestId("paint-btn-100")).toHaveTextContent("Paint");
  });

  it("clicking Paint navigates to painting mode route with assignmentId", async () => {
    const user = userEvent.setup();
    render(<AppliedRecipesTab unitId={1} onApplyRecipe={vi.fn()} />);

    await user.click(screen.getByTestId("paint-btn-100"));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/painting-mode/$assignmentId",
      params: { assignmentId: "100" },
    });
  });

  it("renders recipe names alongside each assignment", () => {
    render(<AppliedRecipesTab unitId={1} onApplyRecipe={vi.fn()} />);

    expect(screen.getByText("Ultramarines Blue")).toBeInTheDocument();
    expect(screen.getByText("Gold NMM")).toBeInTheDocument();
  });
});
