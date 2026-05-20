/**
 * Phase 87 EP-05 -- RecipeDetailSheet Paint button for applied units.
 *
 * Verifies:
 * - Renders per-unit Paint button with data-testid="paint-unit-btn-{id}" when
 *   assignments exist
 * - Does not render paint buttons section when no assignments
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { PaintingRecipe } from "@/types/recipe";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({ data: [] }),
}));

vi.mock("@/hooks/useUnits", () => ({
  useUnits: () => ({
    data: [
      { id: 1, name: "Intercessors" },
      { id: 2, name: "Hellblasters" },
    ],
  }),
}));

vi.mock("@/hooks/usePaints", () => ({
  usePaints: () => ({ data: [] }),
}));

vi.mock("@/hooks/useRecipePaints", () => ({
  useRecipePaints: () => ({ data: [] }),
}));

vi.mock("@/hooks/useRecipeSections", () => ({
  useRecipeSections: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useRecipes", () => ({
  useDuplicateRecipe: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useWishlistItems", () => ({
  useWishlistItems: () => ({ data: [] }),
  useCreateWishlistItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useJournalSessions", () => ({
  useSessionsByRecipe: () => ({ data: [] }),
}));

let mockAssignments: Array<{ id: number; unit_id: number; recipe_id: number; created_at: string }> = [];

vi.mock("@/hooks/useRecipeAssignments", () => ({
  useAssignmentsByRecipe: () => ({ data: mockAssignments }),
}));

vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn().mockResolvedValue("/app/data"),
  join: vi.fn().mockImplementation((...parts: string[]) =>
    Promise.resolve(parts.join("/")),
  ),
}));

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `asset://${path}`,
}));

// SectionedTimeline/RecipeStepTimeline may have complex rendering -- let them render
// but mock isPaintMissing to avoid issues
vi.mock("@/features/recipes/recipeSteps", () => ({
  isPaintMissing: () => false,
}));

// ApplyToUnitsDialog stub
vi.mock("@/features/recipes/ApplyToUnitsDialog", () => ({
  ApplyToUnitsDialog: () => null,
}));

import { RecipeDetailSheet } from "@/features/recipes/RecipeDetailSheet";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const baseRecipe: PaintingRecipe = {
  id: 1,
  name: "Ultramarines Scheme",
  faction_id: null,
  unit_id: null,
  area: null,
  primer: null,
  basecoat: null,
  shade: null,
  layer: null,
  highlight: null,
  glaze_filter: null,
  weathering: null,
  technical: null,
  basing: null,
  tutorial_link: null,
  notes: null,
  style: null,
  surface: null,
  effect: null,
  difficulty: null,
  estimated_minutes: null,
  result_photo_path: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EP-05: RecipeDetailSheet Paint buttons for applied units", () => {
  it("renders Paint button per assignment with data-testid='paint-unit-btn-{id}'", () => {
    mockAssignments = [
      { id: 50, unit_id: 1, recipe_id: 1, created_at: "2026-01-01" },
      { id: 60, unit_id: 2, recipe_id: 1, created_at: "2026-01-02" },
    ];

    render(
      <RecipeDetailSheet
        open={true}
        recipe={baseRecipe}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByTestId("paint-unit-btn-50")).toBeInTheDocument();
    expect(screen.getByTestId("paint-unit-btn-60")).toBeInTheDocument();
  });

  it("renders unit names next to paint buttons", () => {
    mockAssignments = [
      { id: 50, unit_id: 1, recipe_id: 1, created_at: "2026-01-01" },
    ];

    render(
      <RecipeDetailSheet
        open={true}
        recipe={baseRecipe}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByTestId("paint-unit-btn-50")).toHaveTextContent("Paint");
  });

  it("clicking Paint button navigates to painting mode route", async () => {
    const user = userEvent.setup();
    mockAssignments = [
      { id: 50, unit_id: 1, recipe_id: 1, created_at: "2026-01-01" },
    ];

    render(
      <RecipeDetailSheet
        open={true}
        recipe={baseRecipe}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    await user.click(screen.getByTestId("paint-unit-btn-50"));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/painting-mode/$assignmentId",
      params: { assignmentId: "50" },
    });
  });

  it("does not render Applied to Units section when no assignments exist", () => {
    mockAssignments = [];

    render(
      <RecipeDetailSheet
        open={true}
        recipe={baseRecipe}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.queryByText("Applied to Units")).not.toBeInTheDocument();
    expect(screen.queryByTestId("paint-unit-btn-50")).not.toBeInTheDocument();
  });
});
