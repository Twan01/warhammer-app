import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRecipeSections,
  createRecipeSection,
  updateRecipeSection,
  deleteRecipeSection,
  reorderRecipeSections,
  getStepCountsBySection,
  getSectionCountsByRecipe,
} from "@/db/queries/recipeSections";
import {
  RECIPE_PAINTS_KEY,
  STEP_COUNTS_KEY,
  RECIPE_AVAILABILITY_KEY,
  RECIPE_SWATCH_KEY,
} from "@/hooks/useRecipePaints";
import type { CreateRecipeSectionInput, UpdateRecipeSectionInput } from "@/types/recipeSection";

export const RECIPE_SECTIONS_KEY = (recipeId: number) => ["recipe-sections", recipeId] as const;
export const SECTION_STEP_COUNTS_KEY = ["section-step-counts"] as const;
export const SECTION_COUNTS_KEY = ["recipe-section-counts"] as const;

export function useRecipeSections(recipeId: number | undefined) {
  return useQuery({
    queryKey: recipeId !== undefined ? RECIPE_SECTIONS_KEY(recipeId) : ["recipe-sections"],
    queryFn: () => (recipeId !== undefined ? getRecipeSections(recipeId) : Promise.resolve([])),
    enabled: recipeId !== undefined,
  });
}

export function useCreateRecipeSection() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateRecipeSectionInput>({
    mutationFn: createRecipeSection,
    onSuccess: (_, input) => {
      qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(input.recipe_id) });
    },
  });
}

export function useUpdateRecipeSection() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateRecipeSectionInput & { recipe_id: number }>({
    mutationFn: ({ recipe_id: _recipe_id, ...rest }) => updateRecipeSection(rest),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(variables.recipe_id) });
    },
  });
}

export function useDeleteRecipeSection() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: number; recipeId: number }>({
    mutationFn: ({ id }) => deleteRecipeSection(id),
    onSuccess: (_, variables) => {
      /**
       * CASCADE INVALIDATION CONTRACT -- do not reduce.
       * Deleting a section cascades to recipe_steps (ON DELETE CASCADE).
       * Those step deletions make 4 additional cache keys stale:
       *   RECIPE_PAINTS_KEY   -- per-recipe step list
       *   STEP_COUNTS_KEY     -- batch step counts
       *   RECIPE_AVAILABILITY_KEY -- paint availability badge
       *   RECIPE_SWATCH_KEY   -- swatch color strip
       * All 5 keys must be invalidated to keep UI consistent.
       */
      qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(variables.recipeId) });
      qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(variables.recipeId) });
      qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
    },
  });
}

export function useReorderRecipeSections() {
  const qc = useQueryClient();
  return useMutation<void, Error, { sections: { id: number; order_index: number }[]; recipeId: number }>({
    mutationFn: ({ sections }) => reorderRecipeSections(sections),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(variables.recipeId) });
    },
  });
}

export function useSectionStepCounts() {
  return useQuery({
    queryKey: SECTION_STEP_COUNTS_KEY,
    queryFn: async () => {
      const rows = await getStepCountsBySection();
      return new Map(rows.map((r) => [r.section_id, r.step_count]));
    },
  });
}

export function useAllSectionCounts() {
  return useQuery({
    queryKey: SECTION_COUNTS_KEY,
    queryFn: async () => {
      const rows = await getSectionCountsByRecipe();
      return new Map(rows.map((r) => [r.recipe_id, r.section_count]));
    },
  });
}
