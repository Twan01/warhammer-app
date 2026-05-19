/**
 * PROJ-01 — batch enrichment data for kanban cards.
 * Fetches recipe names, photo counts, and applied recipe progress in parallel.
 * Query key uses sorted IDs to prevent re-fetch on dnd-kit reorder (Pitfall 2).
 */
import { useQuery } from "@tanstack/react-query";
import { getRecipeNamesByUnitIds, getRecipeById } from "@/db/queries/recipes";
import { getPhotoCountsByUnitIds } from "@/db/queries/unitPhotos";
import type { AppliedRecipeProgress } from "@/types/recipeAssignment";
import { getAssignmentsByUnit, getStepProgress } from "@/db/queries/recipeAssignments";
import { getRecipePaintsByRecipe } from "@/db/queries/recipePaints";
import { computeAssignmentProgress } from "@/lib/computeAssignmentProgress";

export interface KanbanEnrichment {
  recipeNames: Map<number, string>;
  photoCounts: Map<number, number>;
  appliedProgress: Map<number, AppliedRecipeProgress>;
  assignmentIds: Map<number, number>;
}

export const KANBAN_ENRICHMENT_KEY = (unitIds: number[]) =>
  ["kanban-enrichment", ...unitIds] as const;

export function useKanbanEnrichment(unitIds: number[]) {
  const sortedIds = [...unitIds].sort((a, b) => a - b);
  return useQuery({
    queryKey: KANBAN_ENRICHMENT_KEY(sortedIds),
    queryFn: async (): Promise<KanbanEnrichment> => {
      const [recipeRows, photoRows] = await Promise.all([
        getRecipeNamesByUnitIds(sortedIds),
        getPhotoCountsByUnitIds(sortedIds),
      ]);

      const appliedProgressMap = new Map<number, AppliedRecipeProgress>();
      const assignmentIdsMap = new Map<number, number>();
      await Promise.all(
        sortedIds.map(async (unitId) => {
          const assignments = await getAssignmentsByUnit(unitId);
          if (assignments.length === 0) return;
          const primary = assignments[assignments.length - 1];
          const [steps, progressRows, recipe] = await Promise.all([
            getRecipePaintsByRecipe(primary.recipe_id),
            getStepProgress(primary.id),
            getRecipeById(primary.recipe_id),
          ]);
          const progress = computeAssignmentProgress(steps, progressRows);
          appliedProgressMap.set(unitId, {
            recipeName: recipe?.name ?? "",
            completed: progress.completed,
            total: progress.total,
            assignmentCount: assignments.length,
          });
          assignmentIdsMap.set(unitId, primary.id);
        }),
      );

      return {
        recipeNames: new Map(recipeRows.map((r) => [r.unit_id, r.name])),
        photoCounts: new Map(photoRows.map((r) => [r.entity_id, r.photo_count])),
        appliedProgress: appliedProgressMap,
        assignmentIds: assignmentIdsMap,
      };
    },
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
