/**
 * PROJ-01 — batch enrichment data for kanban cards.
 * Fetches recipe names, photo counts, and applied recipe progress in parallel.
 * Query key uses sorted IDs to prevent re-fetch on dnd-kit reorder (Pitfall 2).
 *
 * PERF-03: Applied recipe progress now uses a single batched SQL query
 * (getKanbanProgressByUnitIds) instead of the previous O(N) per-unit loop
 * that executed 4N DB round-trips. The existing batched calls for recipe
 * names and photo counts are preserved per D-08.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRecipeNamesByUnitIds } from "@/db/queries/recipes";
import { getPhotoCountsByUnitIds } from "@/db/queries/unitPhotos";
import type { AppliedRecipeProgress } from "@/types/recipeAssignment";
import { getKanbanProgressByUnitIds } from "@/db/queries/recipeAssignments";

export interface KanbanEnrichment {
  recipeNames: Map<number, string>;
  photoCounts: Map<number, number>;
  appliedProgress: Map<number, AppliedRecipeProgress>;
  assignmentIds: Map<number, number>;
}

export const KANBAN_ENRICHMENT_KEY = (unitIds: number[]) =>
  ["kanban-enrichment", ...unitIds] as const;

export function useKanbanEnrichment(unitIds: number[]) {
  const sortedIds = useMemo(() => [...unitIds].sort((a, b) => a - b), [unitIds]);
  return useQuery({
    queryKey: KANBAN_ENRICHMENT_KEY(sortedIds),
    queryFn: async (): Promise<KanbanEnrichment> => {
      // D-08: Keep existing batched calls for recipe names and photo counts.
      const [recipeRows, photoRows] = await Promise.all([
        getRecipeNamesByUnitIds(sortedIds),
        getPhotoCountsByUnitIds(sortedIds),
      ]);

      // PERF-03: Single batched query replaces O(N) per-unit loop.
      // Returns one row per unit (most-recent assignment only), with total_steps,
      // completed_steps, recipe_name, and assignment_count already aggregated.
      const appliedProgressMap = new Map<number, AppliedRecipeProgress>();
      const assignmentIdsMap = new Map<number, number>();
      const progressRows = await getKanbanProgressByUnitIds(sortedIds);
      for (const row of progressRows) {
        appliedProgressMap.set(row.unit_id, {
          recipeName: row.recipe_name,
          completed: row.completed_steps,
          total: row.total_steps,
          assignmentCount: row.assignment_count,
        });
        assignmentIdsMap.set(row.unit_id, row.assignment_id);
      }

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
