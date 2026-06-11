/**
 * Phase 126 (FIX-04) -- RecipesPage error state tests.
 *
 * Verifies that when useRecipes returns isError: true, the page shows
 * an error state with AlertCircle and a "Reload Recipes" button.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRefetch = vi.fn();

vi.mock("@/hooks/useRecipes", () => ({
  useRecipes: () => ({
    data: [],
    isLoading: false,
    isError: true,
    refetch: mockRefetch,
  }),
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({ data: [] }),
}));

vi.mock("@/hooks/useUnits", () => ({
  useUnits: () => ({ data: [] }),
}));

vi.mock("@/hooks/useRecipePaints", () => ({
  useRecipeIdsByPaint: () => ({ data: undefined }),
  useRecipeSwatchData: () => ({ data: new Map() }),
  useAllStepCounts: () => ({ data: new Map() }),
  useRecipePaintAvailability: () => ({ data: new Map() }),
}));

vi.mock("@/hooks/useRecipeSections", () => ({
  useAllSectionCounts: () => ({ data: new Map() }),
}));

vi.mock("@/app/router", () => ({
  recipesRoute: {
    useSearch: () => ({ paintId: undefined }),
  },
}));

import { RecipesPage } from "@/features/recipes/RecipesPage";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RecipesPage — FIX-04 error state", () => {
  it("renders 'Failed to load recipes' heading when query fails", () => {
    render(<RecipesPage />);
    expect(screen.getByText("Failed to load recipes")).toBeInTheDocument();
  });

  it("renders 'Reload Recipes' button when query fails", () => {
    render(<RecipesPage />);
    const reloadBtn = screen.getByRole("button", { name: /reload recipes/i });
    expect(reloadBtn).toBeInTheDocument();
  });

  it("renders helper text when query fails", () => {
    render(<RecipesPage />);
    expect(screen.getByText(/check your connection/i)).toBeInTheDocument();
  });

  it("does NOT render filter bar or recipe grid when in error state", () => {
    render(<RecipesPage />);
    // No filter inputs visible
    expect(screen.queryByPlaceholderText(/filter by area/i)).not.toBeInTheDocument();
  });
});
