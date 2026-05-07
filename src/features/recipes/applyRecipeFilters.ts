import type { PaintingRecipe } from "@/types/recipe";
import type { AvailabilityStats } from "@/hooks/useRecipePaints";

export interface RecipeFilterState {
  factionFilter: number[];
  unitFilter: number | null;
  areaFilter: string;
  paintFilter: number | null;
  recipeIdsByPaint: number[] | undefined;
  surfaceFilter: string | null;
  styleFilter: string | null;
  difficultyFilter: string | null;
  hasMissingFilter: boolean;
  availabilityByRecipe: Map<number, AvailabilityStats>;
}

export function applyRecipeFilters(
  recipes: PaintingRecipe[],
  filters: RecipeFilterState,
): PaintingRecipe[] {
  return recipes.filter((r) => {
    // Existing filters
    if (filters.factionFilter.length > 0) {
      if (r.faction_id === null || !filters.factionFilter.includes(r.faction_id)) return false;
    }
    if (filters.unitFilter !== null) {
      if (r.unit_id !== filters.unitFilter) return false;
    }
    const area = filters.areaFilter.trim().toLowerCase();
    if (area.length > 0) {
      if (!r.area || !r.area.toLowerCase().includes(area)) return false;
    }
    if (filters.paintFilter !== null) {
      if (!filters.recipeIdsByPaint || !filters.recipeIdsByPaint.includes(r.id)) return false;
    }
    // New filters
    if (filters.surfaceFilter !== null) {
      if (r.surface !== filters.surfaceFilter) return false;
    }
    if (filters.styleFilter !== null) {
      if (r.style !== filters.styleFilter) return false;
    }
    if (filters.difficultyFilter !== null) {
      if (r.difficulty !== filters.difficultyFilter) return false;
    }
    if (filters.hasMissingFilter) {
      const avail = filters.availabilityByRecipe.get(r.id);
      if (!avail || avail.missing === 0) return false;
    }
    return true;
  });
}
