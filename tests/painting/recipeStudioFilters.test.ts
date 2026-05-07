/**
 * STUDIO-04 — applyRecipeFilters pure function tests.
 * Tests filtering recipes by surface, style, difficulty, and hasMissing.
 */
import { describe, it, expect } from "vitest";
import { applyRecipeFilters } from "@/features/recipes/applyRecipeFilters";
import type { PaintingRecipe } from "@/types/recipe";
import type { AvailabilityStats } from "@/hooks/useRecipePaints";

function makeRecipe(id: number, over: Partial<PaintingRecipe> = {}): PaintingRecipe {
  return {
    id, name: `Recipe ${id}`,
    faction_id: null, unit_id: null, area: null,
    primer: null, basecoat: null, shade: null, layer: null, highlight: null,
    glaze_filter: null, weathering: null, technical: null, basing: null,
    notes: null, tutorial_link: null,
    style: null, surface: null, effect: null, difficulty: null,
    estimated_minutes: null, result_photo_path: null,
    created_at: "2026-01-01", updated_at: "2026-01-01",
    ...over,
  };
}

const BASE_FILTERS = {
  factionFilter: [] as number[],
  unitFilter: null as number | null,
  areaFilter: "",
  paintFilter: null as number | null,
  recipeIdsByPaint: undefined as number[] | undefined,
  surfaceFilter: null as string | null,
  styleFilter: null as string | null,
  difficultyFilter: null as string | null,
  hasMissingFilter: false,
  availabilityByRecipe: new Map<number, AvailabilityStats>(),
};

describe("applyRecipeFilters", () => {
  const recipes = [
    makeRecipe(1, { surface: "Armor", style: "Battle Ready", difficulty: "Beginner" }),
    makeRecipe(2, { surface: "Skin", style: "Parade Ready", difficulty: "Advanced" }),
    makeRecipe(3, { surface: "Armor", style: "Battle Ready", difficulty: "Intermediate" }),
    makeRecipe(4, { surface: "Metal", style: "Display", difficulty: "Expert" }),
  ];

  it("all filters null/false/empty returns full list", () => {
    const result = applyRecipeFilters(recipes, BASE_FILTERS);
    expect(result).toHaveLength(4);
  });

  it("surfaceFilter='Armor' keeps only recipes with surface='Armor'", () => {
    const result = applyRecipeFilters(recipes, { ...BASE_FILTERS, surfaceFilter: "Armor" });
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.surface === "Armor")).toBe(true);
  });

  it("styleFilter='Battle Ready' keeps only recipes with style='Battle Ready'", () => {
    const result = applyRecipeFilters(recipes, { ...BASE_FILTERS, styleFilter: "Battle Ready" });
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.style === "Battle Ready")).toBe(true);
  });

  it("difficultyFilter='Beginner' keeps only recipes with difficulty='Beginner'", () => {
    const result = applyRecipeFilters(recipes, { ...BASE_FILTERS, difficultyFilter: "Beginner" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("hasMissingFilter=true keeps only recipes whose availability has missing > 0", () => {
    const availabilityByRecipe = new Map<number, AvailabilityStats>([
      [1, { owned: 3, missing: 2, runningLow: 0 }],
      [2, { owned: 5, missing: 0, runningLow: 0 }],
      [3, { owned: 1, missing: 1, runningLow: 0 }],
    ]);
    const result = applyRecipeFilters(recipes, {
      ...BASE_FILTERS,
      hasMissingFilter: true,
      availabilityByRecipe,
    });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toContain(1);
    expect(result.map((r) => r.id)).toContain(3);
  });

  it("hasMissingFilter=true excludes recipes not in availability map (no paint links)", () => {
    // recipe 4 not in map — should be excluded
    const availabilityByRecipe = new Map<number, AvailabilityStats>([
      [1, { owned: 2, missing: 1, runningLow: 0 }],
    ]);
    const result = applyRecipeFilters(recipes, {
      ...BASE_FILTERS,
      hasMissingFilter: true,
      availabilityByRecipe,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("combining surface + difficulty narrows correctly", () => {
    const result = applyRecipeFilters(recipes, {
      ...BASE_FILTERS,
      surfaceFilter: "Armor",
      difficultyFilter: "Beginner",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("combining surface + difficulty returns empty when no match", () => {
    const result = applyRecipeFilters(recipes, {
      ...BASE_FILTERS,
      surfaceFilter: "Armor",
      difficultyFilter: "Expert",
    });
    expect(result).toHaveLength(0);
  });
});
