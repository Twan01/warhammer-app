import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  duplicateRecipe,
  getRecipeNamesByUnitIds,
} from "@/db/queries/recipes";
import type { CreateRecipeInput, UpdateRecipeInput } from "@/types/recipe";
import {
  RECIPE_SWATCH_KEY,
  STEP_COUNTS_KEY,
  RECIPE_AVAILABILITY_KEY,
} from "@/hooks/useRecipePaints";
import { SECTION_COUNTS_KEY } from "@/hooks/useRecipeSections";

export const RECIPES_KEY = ["recipes"] as const;
export const RECIPE_KEY = (id: number) => ["recipes", id] as const;

export function useRecipes() {
  return useQuery({ queryKey: RECIPES_KEY, queryFn: getRecipes });
}

export function useRecipe(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? RECIPE_KEY(id) : ["recipes", "disabled"],
    queryFn: () => (id !== undefined ? getRecipeById(id) : Promise.resolve(null)),
    enabled: id !== undefined,
  });
}

// HON-10: Named hook for recipe names by unit IDs.
// Invalidation symmetry confirmed: useCreateRecipe, useUpdateRecipe,
// useDeleteRecipe, useDuplicateRecipe all invalidate ["recipes","by-unit"] prefix.
export const RECIPE_NAMES_BY_UNIT_KEY = (ids: number[]) =>
  ["recipes", "by-unit", ...ids] as const;

export function useRecipeNamesByUnitIds(ids: number[]) {
  return useQuery({
    queryKey: ids.length > 0 ? RECIPE_NAMES_BY_UNIT_KEY(ids) : ["recipes", "by-unit", "disabled"],
    queryFn: () => getRecipeNamesByUnitIds(ids),
    enabled: ids.length > 0,
  });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateRecipeInput>({
    mutationFn: createRecipe,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPES_KEY });
      qc.invalidateQueries({ queryKey: ["kanban-enrichment"] });
      qc.invalidateQueries({ queryKey: ["recipes", "by-unit"] });
    },
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateRecipeInput>({
    mutationFn: updateRecipe,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: RECIPES_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_KEY(variables.id) });
      qc.invalidateQueries({ queryKey: ["kanban-enrichment"] });
      qc.invalidateQueries({ queryKey: ["recipes", "by-unit"] });
    },
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteRecipe,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPES_KEY });
      qc.invalidateQueries({ queryKey: ["kanban-enrichment"] });
      qc.invalidateQueries({ queryKey: ["recipes", "by-unit"] });
      // Cascade-related caches (mirror useDuplicateRecipe) — a deleted recipe's
      // steps/swatches/sections must not linger in derived caches.
      qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
      qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
      qc.invalidateQueries({ queryKey: ["recipe-sections"] });
      qc.invalidateQueries({ queryKey: SECTION_COUNTS_KEY });
    },
  });
}

export function useDuplicateRecipe() {
  const qc = useQueryClient();
  return useMutation<number, Error, { originalId: number; newName: string }>({
    mutationFn: ({ originalId, newName }) => duplicateRecipe(originalId, newName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPES_KEY });
      qc.invalidateQueries({ queryKey: ["kanban-enrichment"] });
      qc.invalidateQueries({ queryKey: ["recipes", "by-unit"] });
      qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
      qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
      // RECIPE_SECTIONS_KEY prefix — covers all per-recipe section queries
      qc.invalidateQueries({ queryKey: ["recipe-sections"] });
      qc.invalidateQueries({ queryKey: SECTION_COUNTS_KEY }); // batch section count cache
    },
  });
}
