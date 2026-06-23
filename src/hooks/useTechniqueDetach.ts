import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { getDb } from "@/db/client";
import { detachTechniqueInstance } from "@/db/queries/recipeTechniqueDetach";
import { TECHNIQUE_INSTANCES_KEY } from "@/hooks/useTechniqueInstances";
import { RECIPE_SECTIONS_KEY } from "@/hooks/useRecipeSections";
import {
  RECIPE_PAINTS_KEY,
  RECIPE_AVAILABILITY_KEY,
  RECIPE_SWATCH_KEY,
  STEP_COUNTS_KEY,
} from "@/hooks/useRecipePaints";
import { SLOT_RESOLUTION_MAP_KEY } from "@/hooks/useSlotResolutionMap";
import {
  TECHNIQUES_WITH_COUNTS_KEY,
  TECHNIQUE_USAGE_COUNTS_KEY,
} from "@/hooks/useTechniques";

// ---------------------------------------------------------------------------
// Mutation input type
// ---------------------------------------------------------------------------

interface DetachTechniqueInput {
  instanceId: number;
  recipeId: number;
}

// ---------------------------------------------------------------------------
// Invalidation helper
// ---------------------------------------------------------------------------

/**
 * Invalidates all cache keys that depend on the recipe's step/section graph,
 * PLUS the two technique-level keys whose counts change when an instance is
 * detached.
 *
 * CASCADE CONTRACT (mirrors invalidateAfterApply in useTechniqueInstances.ts):
 *   1. TECHNIQUE_INSTANCES_KEY      — instance list for the recipe
 *   2. RECIPE_SECTIONS_KEY          — section list (technique link NULLed)
 *   3. RECIPE_PAINTS_KEY            — step-level paint list (slots baked)
 *   4. STEP_COUNTS_KEY              — batch step count per recipe
 *   5. RECIPE_AVAILABILITY_KEY      — paint availability badge
 *   6. RECIPE_SWATCH_KEY            — swatch color strip
 *   7. SLOT_RESOLUTION_MAP_KEY      — slot-resolved paint map (maps deleted)
 *   8. TECHNIQUES_WITH_COUNTS_KEY   — usage count drops when last instance gone
 *   9. TECHNIQUE_USAGE_COUNTS_KEY   — per-technique usage count map
 */
function invalidateAfterDetach(qc: QueryClient, recipeId: number): void {
  qc.invalidateQueries({ queryKey: TECHNIQUE_INSTANCES_KEY(recipeId) });
  qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(recipeId) });
  qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(recipeId) });
  qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
  qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
  qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
  qc.invalidateQueries({ queryKey: SLOT_RESOLUTION_MAP_KEY(recipeId) });
  qc.invalidateQueries({ queryKey: TECHNIQUES_WITH_COUNTS_KEY });
  qc.invalidateQueries({ queryKey: TECHNIQUE_USAGE_COUNTS_KEY });
}

// ---------------------------------------------------------------------------
// useDetachTechniqueInstance — mutation hook
// ---------------------------------------------------------------------------

/**
 * Mutation hook that detaches a technique instance from a recipe section.
 *
 * Bakes slot-resolved colours into recipe_steps.paint_id, NULLs FK link
 * columns, and deletes the instance row. After success, invalidates the full
 * 9-key CASCADE so every surface refreshes (SAFE-02 / SAFE-03 / T-146-06).
 *
 * mutationFn calls getDb() once then delegates to detachTechniqueInstance(db, instanceId).
 * recipeId is NOT passed to the data layer — it is used only for cache invalidation.
 */
export function useDetachTechniqueInstance() {
  const qc = useQueryClient();
  return useMutation<void, Error, DetachTechniqueInput>({
    mutationFn: async ({ instanceId }) => {
      const db = await getDb();
      return detachTechniqueInstance(db, instanceId);
    },
    onSuccess: (_, variables) => {
      invalidateAfterDetach(qc, variables.recipeId);
    },
  });
}
