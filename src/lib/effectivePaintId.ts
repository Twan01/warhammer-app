/**
 * Phase 141 (FND-04) — Single paint-resolution spine for the Technique Library.
 *
 * Every paint consumer (Painting Mode, paint availability, apply-to-units,
 * SectionedTimeline) MUST read effective paint through effectivePaintId() rather
 * than accessing step.paint_id directly. Under Option A (materialisation),
 * technique-owned steps always carry paint_id = null; their real paint lives in
 * the slot map built from recipe_technique_slot_maps.
 *
 * Consumer wiring lands in Phases 143/145. This phase only creates and proves
 * the function in isolation; all existing tests remain green (SC#4).
 *
 * Pure: no DB, no I/O, no side effects. Safe to call from any layer.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal data the function needs from a step row (structural/partial-row safe). */
export interface PaintResolvableStep {
  paint_id: number | null;
  /** undefined = field absent (pre-051 row or plain step); null = explicitly unlinked */
  technique_step_id?: number | null;
}

/**
 * Lookup the caller builds once from recipe_technique_slot_maps joined to the
 * step's source technique_steps.colour_slot_id.
 *   key:   technique_step_id
 *   value: resolved paint_id for that step in THIS recipe instance
 *          (null = unfilled slot — caller did not pick a paint for this slot)
 */
export type SlotResolutionMap = ReadonlyMap<number, number | null>;

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

/**
 * Return the effective paint_id for a recipe step.
 *
 * Resolution rule:
 *  - Technique-owned step (technique_step_id != null): resolve via slotMap.
 *    If the slot key is missing or mapped to null the slot is unfilled → null.
 *  - Plain recipe step (technique_step_id == null): return step.paint_id as-is
 *    (FND-04 fallback — existing paint-display logic continues to work).
 */
export function effectivePaintId(
  step: PaintResolvableStep,
  slotMap: SlotResolutionMap,
): number | null {
  if (step.technique_step_id != null) {
    // Technique-owned step → resolve via slot map.
    // slotMap.get() returns undefined for missing keys; ?? null collapses both
    // undefined (key missing) and null (slot explicitly unfilled) to null.
    return slotMap.get(step.technique_step_id) ?? null;
  }
  // Plain recipe step → its own paint_id (FND-04 fallback).
  return step.paint_id;
}
