import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applyTechnique, getInstancesForRecipe } from "@/db/queries/recipeTechniqueInstances";
import { updateSlotMap } from "@/db/queries/recipeTechniqueSlotMaps";
import {
  RECIPE_SECTIONS_KEY,
} from "@/hooks/useRecipeSections";
import {
  RECIPE_PAINTS_KEY,
  RECIPE_AVAILABILITY_KEY,
  RECIPE_SWATCH_KEY,
  STEP_COUNTS_KEY,
} from "@/hooks/useRecipePaints";
import { SLOT_RESOLUTION_MAP_KEY, SLOT_MAP_BY_INSTANCE_KEY } from "@/hooks/useSlotResolutionMap";
import type { QueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const TECHNIQUE_INSTANCES_KEY = (recipeId: number) =>
  ["technique-instances", recipeId] as const;

// ---------------------------------------------------------------------------
// Shared CASCADE invalidation helper
// ---------------------------------------------------------------------------

/**
 * Invalidates all cache keys that depend on the recipe's step/section graph.
 *
 * CASCADE CONTRACT (mirrors useRecipeSections.ts lines 51-73 + new keys):
 *   1. TECHNIQUE_INSTANCES_KEY  — instance list for the recipe
 *   2. RECIPE_SECTIONS_KEY      — section list (sections were added)
 *   3. RECIPE_PAINTS_KEY        — step-level paint list (steps were added)
 *   4. STEP_COUNTS_KEY          — batch step count per recipe
 *   5. RECIPE_AVAILABILITY_KEY  — paint availability badge
 *   6. RECIPE_SWATCH_KEY        — swatch color strip
 *   7. SLOT_RESOLUTION_MAP_KEY  — slot-resolved paint map (new slot maps added)
 */
function invalidateAfterApply(qc: QueryClient, recipeId: number): void {
  qc.invalidateQueries({ queryKey: TECHNIQUE_INSTANCES_KEY(recipeId) });
  qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(recipeId) });
  qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(recipeId) });
  qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
  qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
  qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
  qc.invalidateQueries({ queryKey: SLOT_RESOLUTION_MAP_KEY(recipeId) });
}

// ---------------------------------------------------------------------------
// Mutation input types
// ---------------------------------------------------------------------------

interface ApplyTechniqueInput {
  recipeId: number;
  techniqueId: number;
  insertAfterSectionIndex: number;
  slotFills: Map<number, number | null>;
}

interface UpdateSlotMapInput {
  instanceId: number;
  recipeId: number;
  slotFills: Map<number, number | null>;
}

// ---------------------------------------------------------------------------
// useInstancesForRecipe — read hook for technique instances in a recipe
// ---------------------------------------------------------------------------

/**
 * Returns all technique instances applied to a recipe (enabled-by-id pattern).
 * Used by RecipeSectionList to resolve instance_id → technique_name for badges.
 */
export function useInstancesForRecipe(recipeId: number | undefined) {
  return useQuery({
    queryKey: recipeId !== undefined ? TECHNIQUE_INSTANCES_KEY(recipeId) : ["technique-instances"],
    queryFn: () =>
      recipeId !== undefined ? getInstancesForRecipe(recipeId) : Promise.resolve([]),
    enabled: recipeId !== undefined,
  });
}

// ---------------------------------------------------------------------------
// useApplyTechnique — insert-only apply mutation
// ---------------------------------------------------------------------------

/**
 * Mutation hook that applies a technique to a recipe.
 *
 * On success: invalidates the full 7-key CASCADE to keep UI coherent.
 */
export function useApplyTechnique() {
  const qc = useQueryClient();
  return useMutation<number, Error, ApplyTechniqueInput>({
    mutationFn: ({ recipeId, techniqueId, insertAfterSectionIndex, slotFills }) =>
      applyTechnique(recipeId, techniqueId, insertAfterSectionIndex, slotFills),
    onSuccess: (_, variables) => {
      invalidateAfterApply(qc, variables.recipeId);
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateSlotMap — update slot fills for an existing instance
// ---------------------------------------------------------------------------

/**
 * Mutation hook that updates slot fills for an existing technique instance.
 *
 * Accepts recipeId so the resolved-paint keys can be invalidated.
 * Invalidates: SLOT_RESOLUTION_MAP_KEY + SLOT_MAP_BY_INSTANCE_KEY +
 *   RECIPE_PAINTS_KEY + RECIPE_SWATCH_KEY + RECIPE_AVAILABILITY_KEY.
 *
 * WR-01 fix: SLOT_MAP_BY_INSTANCE_KEY was not invalidated, causing the
 * EditColoursDialog prefill to show stale values when reopened within the
 * 5-minute staleTime window after a successful save.
 */
export function useUpdateSlotMap() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateSlotMapInput>({
    mutationFn: ({ instanceId, slotFills }) => updateSlotMap(instanceId, slotFills),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: SLOT_RESOLUTION_MAP_KEY(variables.recipeId) });
      qc.invalidateQueries({ queryKey: SLOT_MAP_BY_INSTANCE_KEY(variables.instanceId) }); // WR-01
      qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(variables.recipeId) });
      qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// useGetInstancesForRecipe — unused direct import guard (avoids noUnusedLocals)
// ---------------------------------------------------------------------------

// Re-export so callers who want a plain query can import from this file.
export { getInstancesForRecipe };
