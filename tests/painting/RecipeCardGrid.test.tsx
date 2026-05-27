/**
 * STUDIO-01 â€” RecipeCardGrid rendering tests.
 * Tests grid states: loading, empty, data.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecipeCardGrid } from "@/features/recipes/RecipeCardGrid";
import type { PaintingRecipe } from "@/types/recipe";
import type { Faction } from "@/types/faction";
import type { Unit } from "@/types/unit";
import type { AvailabilityStats } from "@/hooks/useRecipePaints";

function makeRecipe(id: number, name: string): PaintingRecipe {
  return {
    id, name,
    faction_id: null, unit_id: null, area: null,
    primer: null, basecoat: null, shade: null, layer: null, highlight: null,
    glaze_filter: null, weathering: null, technical: null, basing: null,
    notes: null, tutorial_link: null,
    style: null, surface: null, effect: null, difficulty: null,
    estimated_minutes: null, result_photo_path: null,
    created_at: "2026-01-01", updated_at: "2026-01-01",
  };
}

function renderGrid(props: Partial<Parameters<typeof RecipeCardGrid>[0]> = {}) {
  const baseProps = {
    data: [] as PaintingRecipe[],
    factions: [] as Faction[],
    units: [] as Unit[],
    stepCountByRecipe: new Map<number, number>(),
    sectionCountByRecipe: new Map<number, number>(),
    swatchColorsByRecipe: new Map<number, { paint_id: number; hex_color: string | null }[]>(),
    availabilityByRecipe: new Map<number, AvailabilityStats>(),
    isLoading: false,
    onCardClick: vi.fn(),
    onAdd: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };
  return render(<RecipeCardGrid {...baseProps} {...props} />);
}

describe("RecipeCardGrid", () => {
  it("Test 10: renders correct number of RecipeCard elements matching data array", () => {
    const data = [
      makeRecipe(1, "Red Armor"),
      makeRecipe(2, "Blue Cloth"),
      makeRecipe(3, "Metal Sword"),
    ];
    renderGrid({ data });
    // Each recipe name should appear in the grid
    expect(screen.getByText("Red Armor")).toBeInTheDocument();
    expect(screen.getByText("Blue Cloth")).toBeInTheDocument();
    expect(screen.getByText("Metal Sword")).toBeInTheDocument();
  });

  it("Test 11: renders RecipeEmptyState when data is empty and not loading", () => {
    renderGrid({ data: [], isLoading: false });
    expect(screen.getByText("No recipes yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New recipe" })).toBeInTheDocument();
  });

  it("Test 12: renders skeleton cards when isLoading=true", () => {
    renderGrid({ data: [], isLoading: true });
    const skeletons = screen.getAllByTestId("recipe-card-skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
    // Empty state should NOT be visible while loading
    expect(screen.queryByText("No recipes yet")).not.toBeInTheDocument();
  });
});
