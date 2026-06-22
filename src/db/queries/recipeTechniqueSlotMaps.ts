/**
 * Recipe Technique Slot Maps — resolution spine (v0.7.0 Phase 143).
 *
 * Provides three query functions for the slot-fill system:
 *
 *   getSlotResolutionMap — builds Map<recipe_step_id, paint_id|null> for the
 *     entire recipe; keyed on recipe_steps.id (the materialised step PK) so
 *     two applications of the same technique get distinct map entries.
 *     SLOT-04 fix (CR-01): previously keyed on technique_step_id which caused
 *     a collision when the same technique was applied twice — the second
 *     application's row overwrote the first in the JS Map, causing the first
 *     application's steps to resolve to the wrong paint.
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
 * Key: rs.id (recipe_step PK), NOT rs.technique_step_id (only unique per-technique,
 * not per-recipe-application — two applications of the same technique share
 * technique_step_id values but have distinct recipe_step ids).
 */

import { getDb } from "@/db/client";

// ---------------------------------------------------------------------------
// getSlotResolutionMap — Map<recipe_step_id, paint_id|null> for a recipe
// ---------------------------------------------------------------------------

/**
 * Build the slot resolution map for a recipe.
 *
 * The map is keyed on recipe_steps.id (the materialised step PK). This ensures
 * that when the same technique is applied twice (SLOT-04), each application's
 * steps resolve independently to their own instance's slot fills.
 *
 * effectivePaintId() looks up step.id in this map (not technique_step_id).
 *
 * Unfilled slots (no slot_map row, or slot_map.paint_id = NULL) → null.
 * Plain recipe_steps (technique_step_id IS NULL) are excluded by WHERE clause.
 * Steps in technique sections where colour_slot_id IS NULL (slotless steps) yield
 * null paint by design — they have no colour slot, so sm.paint_id is always NULL
 * via the LEFT JOIN (NULL = NULL evaluates to UNKNOWN in SQL, never TRUE).
 *
 * @param recipeId  The recipe to load the map for.
 */
export async function getSlotResolutionMap(
  recipeId: number,
): Promise<Map<number, number | null>> {
  const db = await getDb();

  const rows = await db.select<{ recipe_step_id: number; paint_id: number | null }[]>(
    `SELECT rs.id AS recipe_step_id, sm.paint_id
     FROM recipe_steps rs
     JOIN recipe_sections rsec ON rsec.id = rs.section_id
     JOIN recipe_technique_instances rti ON rti.id = rsec.technique_instance_id
     JOIN technique_steps ts ON ts.id = rs.technique_step_id
     LEFT JOIN recipe_technique_slot_maps sm
       ON sm.instance_id = rti.id AND sm.slot_id = ts.colour_slot_id
     WHERE rs.recipe_id = $1 AND rs.technique_step_id IS NOT NULL
     -- (ts.colour_slot_id IS NULL means no slot; sm.paint_id will be NULL via LEFT JOIN)`,
    [recipeId],
  );

  const map = new Map<number, number | null>();
  for (const row of rows) {
    map.set(row.recipe_step_id, row.paint_id ?? null);
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
// getUnfilledSlotCount — count of unfilled colour slots across non-detached instances
// ---------------------------------------------------------------------------

/**
 * Count the number of unfilled colour slots for a recipe.
 *
 * A slot is considered unfilled when:
 *   - There is no recipe_technique_slot_maps row for it (sm.instance_id IS NULL), OR
 *   - There is a row but paint_id is NULL (explicitly unfilled).
 *
 * Detached instances (rti.detached = 1) are excluded — their slot fills are stale
 * and should not count toward the recipe's readiness banner.
 *
 * CRITICAL: Uses LEFT JOIN on recipe_technique_slot_maps. An INNER JOIN would
 * silently omit slots with no map row, undercounting unfilled slots (T-145-01).
 *
 * @param recipeId  The recipe to count unfilled slots for.
 */
export async function getUnfilledSlotCount(recipeId: number): Promise<number> {
  const db = await getDb();

  const rows = await db.select<{ unfilled_count: number }[]>(
    `SELECT COUNT(*) AS unfilled_count
     FROM recipe_technique_instances rti
     JOIN technique_colour_slots tcs ON tcs.technique_id = rti.technique_id
     LEFT JOIN recipe_technique_slot_maps sm
       ON sm.instance_id = rti.id AND sm.slot_id = tcs.id
     WHERE rti.recipe_id = $1
       AND rti.detached = 0
       AND (sm.instance_id IS NULL OR sm.paint_id IS NULL)`,
    [recipeId],
  );

  return rows[0]?.unfilled_count ?? 0;
}

// ---------------------------------------------------------------------------
// getStepSlotIdMap — Map<recipe_step_id, colour_slot_id|null> for mini-dialog targeting
// ---------------------------------------------------------------------------

/**
 * Build a map from recipe_step.id to the colour_slot_id of the technique step.
 *
 * Reuses the same JOIN chain as getSlotResolutionMap but returns the slot id
 * (not the resolved paint id). Used by PaintingModeView to know which slot a
 * tapped technique step maps to, enabling the SlotReassignMiniDialog to target
 * exactly the right slot.
 *
 * Only technique steps (technique_step_id IS NOT NULL) are included.
 * Plain recipe steps are omitted — they have no colour slot.
 *
 * @param recipeId  The recipe to build the map for.
 */
export async function getStepSlotIdMap(
  recipeId: number,
): Promise<Map<number, number | null>> {
  const db = await getDb();

  const rows = await db.select<{ recipe_step_id: number; slot_id: number | null }[]>(
    `SELECT rs.id AS recipe_step_id, ts.colour_slot_id AS slot_id
     FROM recipe_steps rs
     JOIN recipe_sections rsec ON rsec.id = rs.section_id
     JOIN recipe_technique_instances rti ON rti.id = rsec.technique_instance_id
     JOIN technique_steps ts ON ts.id = rs.technique_step_id
     WHERE rs.recipe_id = $1 AND rs.technique_step_id IS NOT NULL`,
    [recipeId],
  );

  const map = new Map<number, number | null>();
  for (const row of rows) {
    map.set(row.recipe_step_id, row.slot_id ?? null);
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
