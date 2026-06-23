import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTechniques,
  getTechnique,
  getTechniquesWithCounts,
  getTechniqueUsageCounts,
  getTechniqueUsedByRecipes,
  saveTechniqueGraph,
  duplicateTechnique,
} from "@/db/queries/techniques";
import { detachAllAndDeleteTechnique } from "@/db/queries/recipeTechniqueDetach";
import type {
  DraftTechniqueSlot,
  DraftTechniqueSection,
  TechniqueColourSlot,
  TechniqueSection,
  TechniqueStep,
  TechniqueFormValues,
} from "@/types/technique";
import {
  RECIPE_AVAILABILITY_KEY,
  RECIPE_SWATCH_KEY,
  STEP_COUNTS_KEY,
} from "@/hooks/useRecipePaints";

// ---------------------------------------------------------------------------
// Query key factories
// ---------------------------------------------------------------------------

export const TECHNIQUES_KEY = ["techniques"] as const;
export const TECHNIQUE_KEY = (id: number) => ["techniques", id] as const;
export const TECHNIQUES_WITH_COUNTS_KEY = ["techniques-with-counts"] as const;
export const TECHNIQUE_USAGE_COUNTS_KEY = ["technique-usage-counts"] as const;

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

export function useTechniques() {
  return useQuery({ queryKey: TECHNIQUES_KEY, queryFn: getTechniques });
}

export function useTechniquesWithCounts() {
  return useQuery({
    queryKey: TECHNIQUES_WITH_COUNTS_KEY,
    queryFn: getTechniquesWithCounts,
  });
}

export function useTechnique(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? TECHNIQUE_KEY(id) : ["techniques", "disabled"],
    queryFn: () => (id !== undefined ? getTechnique(id) : Promise.resolve(null)),
    enabled: id !== undefined,
  });
}

export function useTechniqueUsedByRecipes(id: number | undefined) {
  return useQuery({
    queryKey:
      id !== undefined
        ? ["technique-used-by", id]
        : ["technique-used-by", "disabled"],
    queryFn: () =>
      id !== undefined
        ? getTechniqueUsedByRecipes(id)
        : Promise.resolve([]),
    enabled: id !== undefined,
  });
}

export function useTechniqueUsageCounts() {
  return useQuery({
    queryKey: TECHNIQUE_USAGE_COUNTS_KEY,
    queryFn: getTechniqueUsageCounts,
  });
}

// ---------------------------------------------------------------------------
// Graph save mutation input type
// ---------------------------------------------------------------------------

export interface TechniqueGraphInput {
  formValues: TechniqueFormValues;
  slots: DraftTechniqueSlot[];
  sections: DraftTechniqueSection[];
  existingSlots: TechniqueColourSlot[];
  existingSections: TechniqueSection[];
  existingSteps: TechniqueStep[];
}

// ---------------------------------------------------------------------------
// Mutation helpers — shared invalidation to avoid repetition
// ---------------------------------------------------------------------------

function invalidateTechniqueKeys(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: TECHNIQUES_KEY });
  qc.invalidateQueries({ queryKey: TECHNIQUES_WITH_COUNTS_KEY });
  qc.invalidateQueries({ queryKey: TECHNIQUE_USAGE_COUNTS_KEY });
  // Prefix invalidation clears all per-technique section/slot caches
  qc.invalidateQueries({ queryKey: ["technique-sections"] });
  qc.invalidateQueries({ queryKey: ["technique-colour-slots"] });
  qc.invalidateQueries({ queryKey: ["technique-used-by"] });
}

// ---------------------------------------------------------------------------
// Write hooks
// ---------------------------------------------------------------------------

/** Create a new technique with full graph (slots + sections + steps). */
export function useCreateTechnique() {
  const qc = useQueryClient();
  return useMutation<number, Error, TechniqueGraphInput>({
    mutationFn: ({ formValues, slots, sections, existingSlots, existingSections, existingSteps }) =>
      saveTechniqueGraph(null, formValues, slots, sections, existingSlots, existingSections, existingSteps),
    onSuccess: () => {
      invalidateTechniqueKeys(qc);
    },
  });
}

/** Update an existing technique with full graph (non-destructive diff). */
export function useUpdateTechnique() {
  const qc = useQueryClient();
  return useMutation<number, Error, { techniqueId: number } & TechniqueGraphInput>({
    mutationFn: ({ techniqueId, formValues, slots, sections, existingSlots, existingSections, existingSteps }) =>
      saveTechniqueGraph(techniqueId, formValues, slots, sections, existingSlots, existingSections, existingSteps),
    onSuccess: (_, variables) => {
      invalidateTechniqueKeys(qc);
      qc.invalidateQueries({ queryKey: TECHNIQUE_KEY(variables.techniqueId) });
      // resyncTechniqueInstances may have written to many recipes — broadcast prefix
      // invalidations so every affected recipe's UI refreshes (LINK-01 / T-144-06).
      // Prefix invalidation (no recipeId arg) clears ALL per-recipe entries in the cache.
      // Mirrors invalidateAfterApply in useTechniqueInstances.ts.
      qc.invalidateQueries({ queryKey: ["recipe-sections"] });
      qc.invalidateQueries({ queryKey: ["recipe-steps"] }); // WR-04: guard future step-list consumers
      qc.invalidateQueries({ queryKey: ["recipe-paints"] });
      qc.invalidateQueries({ queryKey: ["slot-resolution-map"] });
      qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
    },
  });
}

/** Delete a technique — auto-detaches live instances first (SAFE-03) then removes the technique row. */
export function useDeleteTechnique() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: detachAllAndDeleteTechnique,
    onSuccess: () => {
      invalidateTechniqueKeys(qc);
      // Prefix invalidations — N recipes affected, no recipeId known.
      // Mirrors useUpdateTechnique lines 135–142.
      qc.invalidateQueries({ queryKey: ["recipe-sections"] });
      qc.invalidateQueries({ queryKey: ["recipe-steps"] });
      qc.invalidateQueries({ queryKey: ["recipe-paints"] });
      qc.invalidateQueries({ queryKey: ["slot-resolution-map"] });
      qc.invalidateQueries({ queryKey: ["technique-instances"] });
      qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
    },
  });
}

/** Duplicate a technique — produces fully fresh IDs across all sub-entities. */
export function useDuplicateTechnique() {
  const qc = useQueryClient();
  return useMutation<number, Error, { originalId: number; newName: string }>({
    mutationFn: ({ originalId, newName }) => duplicateTechnique(originalId, newName),
    onSuccess: () => {
      invalidateTechniqueKeys(qc);
    },
  });
}
