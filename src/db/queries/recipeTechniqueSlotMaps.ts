/**
 * Recipe Technique Slot Maps — resolution spine (v0.7.0 Phase 143).
 *
 * Provides three query functions for the slot-fill system:
 *
 *   getSlotResolutionMap — builds Map<technique_step_id, paint_id|null> for the
 *     entire recipe; keyed on technique_step_id (NOT recipe_step.id) so callers
 *     can pass it directly to effectivePaintId().
 *
 *   getSlotMapByInstance — builds Map<slot_id, paint_id|null> for a specific
 *     instance; used to pre-populate Edit-colours forms.
 *
 *   updateSlotMap — INSERT OR REPLACE slot fills for an instance.
 *
 * All functions: single const db = await getDb(); NO BEGIN/COMMIT/ROLLBACK.
 *
 * JOIN verified against migration 051 schema (RESEARCH Pattern 4):
 *   recipe_steps → recipe_sections → recipe_technique_instances →
 *   technique_steps (for colour_slot_id) → LEFT JOIN recipe_technique_slot_maps
 *
 * Pitfall 3: key on rs.technique_step_id, NOT rs.id.
 */

import { getDb } from "@/db/client";

// ---------------------------------------------------------------------------
// getSlotResolutionMap — Map<technique_step_id, paint_id|null> for a recipe
// ---------------------------------------------------------------------------

/**
 * Build the slot resolution map for a recipe.
 *
 * The map is keyed on technique_step_id (the FK linking a materialised
 * recipe_step back to its source technique_steps row). effectivePaintId() looks
 * up this key when resolving paint for technique-owned steps.
 *
 * Unfilled slots (no slot_map row, or slot_map.paint_id = NULL) → null.
 * Plain recipe_steps (technique_step_id IS NULL) are excluded by WHERE clause.
 *
 * @param recipeId  The recipe to load the map for.
 */
export async function getSlotResolutionMap(
  recipeId: number,
): Promise<Map<number, number | null>> {
  const db = await getDb();

  const rows = await db.select<{ technique_step_id: number; paint_id: number | null }[]>(
    `SELECT rs.technique_step_id, sm.paint_id
     FROM recipe_steps rs
     JOIN recipe_sections rsec ON rsec.id = rs.section_id
     JOIN recipe_technique_instances rti ON rti.id = rsec.technique_instance_id
     JOIN technique_steps ts ON ts.id = rs.technique_step_id
     LEFT JOIN recipe_technique_slot_maps sm
       ON sm.instance_id = rti.id AND sm.slot_id = ts.colour_slot_id
     WHERE rs.recipe_id = $1 AND rs.technique_step_id IS NOT NULL`,
    [recipeId],
  );

  const map = new Map<number, number | null>();
  for (const row of rows) {
    map.set(row.technique_step_id, row.paint_id ?? null);
  }
  return map;
}

// ---------------------------------------------------------------------------
// getSlotMapByInstance — Map<slot_id, paint_id|null> for Edit-colours prefill
// ---------------------------------------------------------------------------

/**
 * Return the current slot fills for a single technique instance.
 *
 * Map is keyed on slot_id (technique_colour_slots.id). Callers fall back to
 * null for any slot with no entry in the map (unfilled).
 *
 * @param instanceId  The recipe_technique_instances.id to read.
 */
export async function getSlotMapByInstance(
  instanceId: number,
): Promise<Map<number, number | null>> {
  const db = await getDb();

  const rows = await db.select<{ slot_id: number; paint_id: number | null }[]>(
    `SELECT slot_id, paint_id FROM recipe_technique_slot_maps WHERE instance_id = $1`,
    [instanceId],
  );

  const map = new Map<number, number | null>();
  for (const row of rows) {
    map.set(row.slot_id, row.paint_id ?? null);
  }
  return map;
}

// ---------------------------------------------------------------------------
// updateSlotMap — INSERT OR REPLACE slot fills for an instance
// ---------------------------------------------------------------------------

/**
 * Persist slot fills for an existing technique instance.
 *
 * Uses INSERT OR REPLACE so that:
 *   - New fills are inserted.
 *   - Existing fills are overwritten with the new paint_id.
 *   - Passing paint_id = null marks the slot as explicitly unfilled.
 *
 * The UNIQUE(instance_id, slot_id) constraint on recipe_technique_slot_maps
 * makes REPLACE semantically correct here.
 *
 * NO BEGIN/COMMIT — auto-commit per statement (mirrors duplicateTechnique).
 *
 * @param instanceId  The recipe_technique_instances.id to update.
 * @param slotFills   Map<slotId, paintId|null> — entries to write.
 */
export async function updateSlotMap(
  instanceId: number,
  slotFills: Map<number, number | null>,
): Promise<void> {
  const db = await getDb();

  for (const [slotId, paintId] of slotFills) {
    await db.execute(
      `INSERT OR REPLACE INTO recipe_technique_slot_maps (instance_id, slot_id, paint_id)
       VALUES ($1, $2, $3)`,
      [instanceId, slotId, paintId ?? null],
    );
  }
}
