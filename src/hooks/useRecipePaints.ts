import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRecipePaintsByRecipe,
  addRecipePaint,
  removeRecipePaint,
  getRecipeIdsByPaintId,
} from "@/db/queries/recipePaints";
import type { CreateRecipePaintInput } from "@/types/recipePaint";

export const RECIPE_PAINTS_KEY = (recipeId: number) => ["recipe-paints", recipeId] as const;

export function useRecipePaints(recipeId: number | undefined) {
  return useQuery({
    queryKey: recipeId !== undefined ? RECIPE_PAINTS_KEY(recipeId) : ["recipe-paints"],
    queryFn: () => (recipeId !== undefined ? getRecipePaintsByRecipe(recipeId) : Promise.resolve([])),
    enabled: recipeId !== undefined,
  });
}

export function useAddRecipePaint() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateRecipePaintInput>({
    mutationFn: addRecipePaint,
    onSuccess: (_, input) => {
      qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(input.recipe_id) });
    },
  });
}

export function useRemoveRecipePaint() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: number; recipeId: number }>({
    mutationFn: ({ id }) => removeRecipePaint(id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(variables.recipeId) });
    },
  });
}

/**
 * Query key for the recipe-ids-by-paint lookup (PINV-05).
 *
 * Per-paint factory: each paint's recipe-id set is its own subtree so a paint
 * mutation invalidates only the relevant cache. Phase 7 does not currently
 * invalidate this key from any mutation — recipe_paints links are written via
 * RecipeFormSheet in Phase 4 code which already invalidates the recipe-paints
 * step counts. This key is read-only on the Recipes page.
 */
export const RECIPE_IDS_BY_PAINT_KEY = (paintId: number) =>
  ["recipe-ids-by-paint", paintId] as const;

/**
 * Returns recipe IDs that include the given paint, via SELECT DISTINCT on
 * recipe_paints. The Recipes page reads `paintId` from URL search params and
 * calls this hook with that value (or null when no paint filter is active).
 *
 * Disabled when paintId is null or undefined — caller can pass the URL search
 * param value directly without first checking it.
 */
export function useRecipeIdsByPaint(paintId: number | null | undefined) {
  const enabled = paintId !== null && paintId !== undefined;
  return useQuery<number[]>({
    queryKey: enabled
      ? RECIPE_IDS_BY_PAINT_KEY(paintId)
      : (["recipe-ids-by-paint", "disabled"] as const),
    queryFn: () =>
      enabled ? getRecipeIdsByPaintId(paintId) : Promise.resolve([] as number[]),
    enabled,
  });
}
