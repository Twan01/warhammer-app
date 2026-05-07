import type { Paint } from "@/types/paint";

export interface DraftStep {
  localId: string;
  step_name: string;
  paint_id: number | null;
  notes: string | null;
  painting_phase: string | null;
  tool: string | null;
  technique: string | null;
  dilution: string | null;
  time_estimate_minutes: number | null;
}

export function makeDraftStep(): DraftStep {
  return {
    localId: crypto.randomUUID(),
    step_name: "",
    paint_id: null,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
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
