/**
 * Recipe Technique Instances — apply flow (v0.7.0 Phase 143).
 *
 * STUB — Plan 02 implements the full applyTechnique function.
 *
 * This file exists to satisfy the TypeScript import in
 * tests/data-layer/apply-technique.test.ts (the RED contract for Plan 02).
 * The stub is intentionally not implemented here; Plan 02 replaces the body.
 *
 * SLOT-03: each instance's slot map is independent.
 * SLOT-04: applying the same technique twice creates two distinct instances.
 */

/**
 * Apply a technique to a recipe: materialise a new recipe_technique_instances row,
 * insert a recipe_sections row with technique_instance_id set, insert recipe_steps
 * rows with technique_step_id set and paint_id NULL, and populate
 * recipe_technique_slot_maps from slotFills.
 *
 * @param recipeId            Target recipe
 * @param techniqueId         Technique to apply
 * @param insertAfterSectionIndex  0-based index; new section is inserted after this index
 * @param slotFills           Map<slotId, paintId> — fills to pre-populate; missing keys = unfilled
 * @returns                   The new recipe_technique_instances.id
 */
export async function applyTechnique(
  _recipeId: number,
  _techniqueId: number,
  _insertAfterSectionIndex: number,
  _slotFills: Map<number, number | null>,
): Promise<number> {
  throw new Error("applyTechnique not yet implemented — see Plan 02");
}
