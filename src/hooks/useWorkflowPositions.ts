/**
 * Phase 60 — Batch workflow position hook (PROJ-03/04/05).
 *
 * Follows the useKanbanEnrichment pattern: page-level query with sorted
 * IDs in the key, Promise.all for parallel sub-queries, Map return type.
 * Internally calls computeWorkflowPosition for each unit that has a
 * recipe and at least one session with step/section data.
 */
import { useQuery } from "@tanstack/react-query";
import { getRecipeNamesByUnitIds } from "@/db/queries/recipes";
import { getSessionsByUnit } from "@/db/queries/paintingSessions";
import { getRecipeSections } from "@/db/queries/recipeSections";
import { getRecipePaintsByRecipe } from "@/db/queries/recipePaints";
import {
  computeWorkflowPosition,
  type WorkflowPosition,
} from "@/lib/computeWorkflowPosition";

export const WORKFLOW_POSITIONS_KEY = (unitIds: number[]) =>
  ["workflow-positions", ...unitIds] as const;

export function useWorkflowPositions(unitIds: number[]) {
  const sortedIds = [...unitIds].sort((a, b) => a - b);

  return useQuery({
    queryKey: WORKFLOW_POSITIONS_KEY(sortedIds),
    queryFn: async (): Promise<Map<number, WorkflowPosition>> => {
      const result = new Map<number, WorkflowPosition>();

      // Step 1: batch recipe lookup (returns id + unit_id + name)
      const recipeRows = await getRecipeNamesByUnitIds(sortedIds);
      const recipeMap = new Map(
        recipeRows.map((r) => [r.unit_id, { id: r.id, name: r.name }]),
      );

      // Step 2: for each unit with a recipe, fetch sessions + sections + steps
      const unitsWithRecipes = sortedIds.filter((uid) => recipeMap.has(uid));

      await Promise.all(
        unitsWithRecipes.map(async (unitId) => {
          const recipe = recipeMap.get(unitId)!;
          const [sessions, sections, steps] = await Promise.all([
            getSessionsByUnit(unitId),
            getRecipeSections(recipe.id),
            getRecipePaintsByRecipe(recipe.id),
          ]);

          // Pitfall 3: find most recent session with recipe step or section info
          const lastSession = sessions.find(
            (s) => s.recipe_step_id !== null || s.section_name !== null,
          );
          if (!lastSession) return;

          const position = computeWorkflowPosition(
            lastSession.recipe_step_id,
            lastSession.section_name,
            sections,
            steps,
          );
          if (position) result.set(unitId, position);
        }),
      );

      return result;
    },
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
