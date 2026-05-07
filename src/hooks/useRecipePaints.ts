import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRecipePaintsByRecipe,
  addRecipePaint,
  removeRecipePaint,
  getRecipeIdsByPaintId,
  getRecipeSwatchColors,
  getStepCountsByRecipe,
  getRecipePaintAvailability,
} from "@/db/queries/recipePaints";
import type { CreateRecipeStepInput } from "@/types/recipePaint";

export const RECIPE_PAINTS_KEY = (recipeId: number) => ["recipe-paints", recipeId] as const;

/**
 * WKSP-02 — query key for the batch swatch color lookup.
 *
 * Single top-level key — all recipe paint additions/removals invalidate the
 * same cache entry, keeping swatch strips fresh without per-recipe granularity.
 * Declared before mutation hooks that reference it.
 */
export const RECIPE_SWATCH_KEY = ["recipe-swatch-colors"] as const;

/**
 * SCHEMA-04 — query key for the batch step count lookup.
 *
 * Single top-level key — invalidated by useAddRecipePaint and useRemoveRecipePaint
 * so step counts in RecipesPage refresh immediately after any step change.
 */
export const STEP_COUNTS_KEY = ["recipe-step-counts"] as const;

export function useRecipePaints(recipeId: number | undefined) {
  return useQuery({
    queryKey: recipeId !== undefined ? RECIPE_PAINTS_KEY(recipeId) : ["recipe-paints"],
    queryFn: () => (recipeId !== undefined ? getRecipePaintsByRecipe(recipeId) : Promise.resolve([])),
    enabled: recipeId !== undefined,
  });
}

export function useAddRecipePaint() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateRecipeStepInput>({
    mutationFn: addRecipePaint,
    onSuccess: (_, input) => {
      qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(input.recipe_id) });
      qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
      qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
    },
  });
}

export function useRemoveRecipePaint() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: number; recipeId: number }>({
    mutationFn: ({ id }) => removeRecipePaint(id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(variables.recipeId) });
      qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
      qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
    },
  });
}

/**
 * Query key for the recipe-ids-by-paint lookup (PINV-05).
 *
 * Per-paint factory: each paint's recipe-id set is its own subtree so a paint
 * mutation invalidates only the relevant cache. Phase 7 does not currently
 * invalidate this key from any mutation — recipe_steps links are written via
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

/**
 * WKSP-02 — maps the flat batch swatch rows into a Map keyed by recipe_id.
 *
 * The UI receives Map<recipe_id, {paint_id, hex_color}[]> and renders swatch
 * strips directly — no further grouping needed at the component level.
 * Invalidated by useAddRecipePaint and useRemoveRecipePaint.
 */
export function useRecipeSwatchData() {
  return useQuery({
    queryKey: RECIPE_SWATCH_KEY,
    queryFn: async () => {
      const rows = await getRecipeSwatchColors();
      const m = new Map<number, { paint_id: number; hex_color: string | null }[]>();
      for (const row of rows) {
        const list = m.get(row.recipe_id) ?? [];
        list.push({ paint_id: row.paint_id, hex_color: row.hex_color });
        m.set(row.recipe_id, list);
      }
      return m;
    },
  });
}

/**
 * SCHEMA-04 — batch step counts for all recipes.
 *
 * Returns Map<recipe_id, step_count> from a single GROUP BY query.
 * Replaces the N+1 loop that called getRecipePaintsByRecipe per recipe.
 * Invalidated by useAddRecipePaint and useRemoveRecipePaint.
 */
export function useAllStepCounts() {
  return useQuery({
    queryKey: STEP_COUNTS_KEY,
    queryFn: async () => {
      const rows = await getStepCountsByRecipe();
      return new Map(rows.map((r) => [r.recipe_id, r.step_count]));
    },
  });
}

/**
 * PAINT-01 — query key for the batch paint availability lookup.
 *
 * Single top-level key — invalidated by useUpdatePaint and useDeletePaint in
 * usePaints.ts so recipe card badges refresh immediately when paint ownership
 * changes on the Paints page.
 */
export const RECIPE_AVAILABILITY_KEY = ["recipe-paint-availability"] as const;

/**
 * PAINT-01 — per-recipe paint availability stats.
 *
 * owned      = step has a paint that is owned and NOT running low
 * missing    = step has a paint that is NOT owned
 * runningLow = step has a paint that is owned and IS running low
 */
export interface AvailabilityStats {
  owned: number;
  missing: number;
  runningLow: number;
}

/**
 * PAINT-01 — batch paint availability for all recipes.
 *
 * Returns Map<recipe_id, AvailabilityStats> from a single GROUP BY JOIN query.
 * Steps with paint_id = 0 or null are excluded (no paint linked).
 * Consumed by Plan 02 (card grid) and Plan 03 (detail timeline).
 */
export function useRecipePaintAvailability() {
  return useQuery({
    queryKey: RECIPE_AVAILABILITY_KEY,
    queryFn: async () => {
      const rows = await getRecipePaintAvailability();
      return new Map<number, AvailabilityStats>(
        rows.map((r) => [
          r.recipe_id,
          { owned: r.owned, missing: r.missing, runningLow: r.running_low },
        ]),
      );
    },
  });
}
