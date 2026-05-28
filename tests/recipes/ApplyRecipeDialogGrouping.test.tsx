/**
 * SCP-02 -- ApplyRecipeDialog faction-based grouping.
 *
 * Verifies:
 * - Suggested/Other groups appear when factionId matches some recipes
 * - Flat list (no group headers) when factionId is null
 * - Flat list when factionId prop is absent (undefined)
 * - Recipes from both groups are selectable
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { PaintingRecipe } from "@/types/recipe";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const RECIPES: PaintingRecipe[] = [
  {
    id: 1, name: "Blue Armour", faction_id: 10, unit_id: null,
    area: null, primer: null, basecoat: null, shade: null, layer: null,
    highlight: null, glaze_filter: null, weathering: null, technical: null,
    basing: null, tutorial_link: null, notes: null, style: null,
    surface: null, effect: null, difficulty: null, estimated_minutes: null,
    result_photo_path: null, created_at: "2026-01-01", updated_at: "2026-01-01",
  },
  {
    id: 2, name: "Gold Trim", faction_id: 10, unit_id: null,
    area: null, primer: null, basecoat: null, shade: null, layer: null,
    highlight: null, glaze_filter: null, weathering: null, technical: null,
    basing: null, tutorial_link: null, notes: null, style: null,
    surface: null, effect: null, difficulty: null, estimated_minutes: null,
    result_photo_path: null, created_at: "2026-01-01", updated_at: "2026-01-01",
  },
  {
    id: 3, name: "Tau Sept Ochre", faction_id: 20, unit_id: null,
    area: null, primer: null, basecoat: null, shade: null, layer: null,
    highlight: null, glaze_filter: null, weathering: null, technical: null,
    basing: null, tutorial_link: null, notes: null, style: null,
    surface: null, effect: null, difficulty: null, estimated_minutes: null,
    result_photo_path: null, created_at: "2026-01-01", updated_at: "2026-01-01",
  },
  {
    id: 4, name: "Universal Basing", faction_id: null, unit_id: null,
    area: null, primer: null, basecoat: null, shade: null, layer: null,
    highlight: null, glaze_filter: null, weathering: null, technical: null,
    basing: null, tutorial_link: null, notes: null, style: null,
    surface: null, effect: null, difficulty: null, estimated_minutes: null,
    result_photo_path: null, created_at: "2026-01-01", updated_at: "2026-01-01",
  },
];

const FACTIONS = [
  { id: 10, name: "Ultramarines", color_theme: "#0000FF", created_at: "2026-01-01", updated_at: "2026-01-01" },
  { id: 20, name: "Tau Empire", color_theme: "#FFD700", created_at: "2026-01-01", updated_at: "2026-01-01" },
];

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useRecipes", () => ({
  useRecipes: () => ({ data: RECIPES }),
}));

vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({ data: FACTIONS }),
}));

vi.mock("@/hooks/useRecipeSections", () => ({
  useRecipeSections: () => ({ data: [] }),
}));

vi.mock("@/hooks/useRecipePaints", () => ({
  useRecipePaints: () => ({ data: [] }),
}));

vi.mock("@/hooks/usePaints", () => ({
  usePaints: () => ({ data: [] }),
}));

vi.mock("@/hooks/useRecipeAssignments", () => ({
  useCreateAssignment: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Stub SectionedTimeline and RecipeStepTimeline to avoid complex rendering
vi.mock("@/features/recipes/SectionedTimeline", () => ({
  SectionedTimeline: () => null,
}));

vi.mock("@/features/recipes/RecipeStepTimeline", () => ({
  RecipeStepTimeline: () => null,
}));

import { ApplyRecipeDialog } from "@/features/recipes/ApplyRecipeDialog";

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SCP-02: ApplyRecipeDialog faction grouping", () => {
  it("shows Suggested and Other groups when factionId matches some recipes", () => {
    render(
      <ApplyRecipeDialog open={true} unitId={1} factionId={10} onClose={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    // Group headers should be present
    expect(screen.getByText("Suggested (2)")).toBeInTheDocument();
    expect(screen.getByText("Other (2)")).toBeInTheDocument();

    // Faction-10 recipes should be visible
    expect(screen.getByText("Blue Armour")).toBeInTheDocument();
    expect(screen.getByText("Gold Trim")).toBeInTheDocument();

    // Other recipes should also be visible
    expect(screen.getByText("Tau Sept Ochre")).toBeInTheDocument();
    expect(screen.getByText("Universal Basing")).toBeInTheDocument();
  });

  it("shows flat list when factionId is null", () => {
    render(
      <ApplyRecipeDialog open={true} unitId={1} factionId={null} onClose={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    // No group headers
    expect(screen.queryByText(/Suggested/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Other/)).not.toBeInTheDocument();

    // All 4 recipes visible
    expect(screen.getByText("Blue Armour")).toBeInTheDocument();
    expect(screen.getByText("Gold Trim")).toBeInTheDocument();
    expect(screen.getByText("Tau Sept Ochre")).toBeInTheDocument();
    expect(screen.getByText("Universal Basing")).toBeInTheDocument();
  });

  it("shows flat list when factionId is undefined (prop absent)", () => {
    render(
      <ApplyRecipeDialog open={true} unitId={1} onClose={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    // No group headers
    expect(screen.queryByText(/Suggested/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Other/)).not.toBeInTheDocument();

    // All 4 recipes visible
    expect(screen.getByText("Blue Armour")).toBeInTheDocument();
    expect(screen.getByText("Gold Trim")).toBeInTheDocument();
    expect(screen.getByText("Tau Sept Ochre")).toBeInTheDocument();
    expect(screen.getByText("Universal Basing")).toBeInTheDocument();
  });

  it("both groups are selectable — clicking Other recipe shows preview", async () => {
    const user = userEvent.setup();

    render(
      <ApplyRecipeDialog open={true} unitId={1} factionId={10} onClose={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    // Click a recipe from the Other group
    await user.click(screen.getByText("Tau Sept Ochre"));

    // Should switch to preview view — back button and recipe name in header
    expect(screen.getByLabelText("Back to recipe list")).toBeInTheDocument();
    expect(screen.getByText("Tau Sept Ochre")).toBeInTheDocument();
  });
});
