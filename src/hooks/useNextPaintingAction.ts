import { useQuery } from "@tanstack/react-query";
import {
  getMostRecentAssignmentWithIncompleteStep,
  type FirstIncompleteStep,
} from "@/db/queries/recipeAssignments";
import { useRecipePaints } from "@/hooks/useRecipePaints";
import { usePaints } from "@/hooks/usePaints";

export const NEXT_PAINTING_ACTION_KEY = ["next-painting-action"] as const;

export interface PaintAvailability {
  paint_id: number;
  name: string;
  brand: string;
  status: "owned" | "running-low" | "missing";
}

export interface NextPaintingAction extends FirstIncompleteStep {
  paints: PaintAvailability[];
}

export function useNextPaintingAction() {
  const stepQuery = useQuery({
    queryKey: NEXT_PAINTING_ACTION_KEY,
    queryFn: getMostRecentAssignmentWithIncompleteStep,
  });

  const step = stepQuery.data;
  const recipePaintsQuery = useRecipePaints(step?.recipe_id);
  const allPaintsQuery = usePaints();

  const data: NextPaintingAction | null = (() => {
    if (!step) return null;

    const recipeSteps = recipePaintsQuery.data ?? [];
    const allPaints = allPaintsQuery.data ?? [];
    const paintMap = new Map(allPaints.map((p) => [p.id, p]));

    const currentStep = recipeSteps.find((s) => s.id === step.recipe_step_id);
    const paintIds: number[] = [];
    if (currentStep?.paint_id) {
      paintIds.push(currentStep.paint_id);
    }
    if (currentStep?.alt_paint_id) {
      paintIds.push(currentStep.alt_paint_id);
    }

    const paints: PaintAvailability[] = paintIds
      .map((pid) => {
        const paint = paintMap.get(pid);
        if (!paint) return null;
        const status: PaintAvailability["status"] =
          paint.owned === 1 && paint.running_low === 1
            ? "running-low"
            : paint.owned === 1
              ? "owned"
              : "missing";
        return { paint_id: paint.id, name: paint.name, brand: paint.brand, status };
      })
      .filter((p): p is PaintAvailability => p !== null);

    return { ...step, paints };
  })();

  return {
    data,
    isLoading: stepQuery.isLoading || recipePaintsQuery.isLoading || allPaintsQuery.isLoading,
    isPending: stepQuery.isPending || recipePaintsQuery.isPending || allPaintsQuery.isPending,
    isError: stepQuery.isError || recipePaintsQuery.isError || allPaintsQuery.isError,
    error: stepQuery.error ?? recipePaintsQuery.error ?? allPaintsQuery.error,
  };
}
