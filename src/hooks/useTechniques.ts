import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTechniques,
  getTechnique,
  getTechniquesWithCounts,
  getTechniqueUsageCounts,
  getTechniqueUsedByRecipes,
  saveTechniqueGraph,
  deleteTechnique,
  duplicateTechnique,
} from "@/db/queries/techniques";
import type {
  DraftTechniqueSlot,
  DraftTechniqueSection,
  TechniqueColourSlot,
  TechniqueSection,
  TechniqueStep,
  TechniqueFormValues,
} from "@/types/technique";

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
    },
  });
}

/** Delete a technique (CASCADE removes sections, steps, and slots). */
export function useDeleteTechnique() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteTechnique,
    onSuccess: () => {
      invalidateTechniqueKeys(qc);
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
