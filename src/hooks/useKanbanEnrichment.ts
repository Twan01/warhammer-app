/**
 * PROJ-01 — batch enrichment data for kanban cards.
 * Fetches recipe names and photo counts in parallel via Promise.all.
 * Query key uses sorted IDs to prevent re-fetch on dnd-kit reorder (Pitfall 2).
 */
import { useQuery } from "@tanstack/react-query";
import { getRecipeNamesByUnitIds } from "@/db/queries/recipes";
import { getPhotoCountsByUnitIds } from "@/db/queries/unitPhotos";

export interface KanbanEnrichment {
  recipeNames: Map<number, string>;
  photoCounts: Map<number, number>;
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
      return {
        recipeNames: new Map(recipeRows.map((r) => [r.unit_id, r.name])),
        photoCounts: new Map(photoRows.map((r) => [r.entity_id, r.photo_count])),
      };
    },
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
