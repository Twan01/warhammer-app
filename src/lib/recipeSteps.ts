/**
 * Pure recipe step utility functions.
 *
 * Relocated from src/features/recipes/recipeSteps.ts to src/lib/ so the query
 * layer (src/db/queries/recipes.ts) can import computeOrderIndex without
 * crossing the feature boundary. All functions are pure.
 */
import type { DraftStep } from "@/types/recipe";
import type { Paint } from "@/types/paint";

export function makeDraftStep(): DraftStep {
  return {
    localId: crypto.randomUUID(),
    dbId: null,
    step_name: "",
    paint_id: null,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
  };
}

export function computeOrderIndex(
  steps: DraftStep[],
): Array<DraftStep & { order_index: number }> {
  return steps.map((s, i) => ({ ...s, order_index: i }));
}

export function isPaintMissing(paint: Paint | undefined | null): boolean {
  if (!paint) return true;
  return paint.owned !== 1;
}
