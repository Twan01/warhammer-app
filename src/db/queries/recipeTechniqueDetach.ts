/**
 * Recipe Technique Detach — one-way escape hatch (v0.7.0 Phase 146).
 *
 * detachTechniqueInstance: for every technique-owned recipe_steps row in the
 * instance, bakes effectivePaintId() into recipe_steps.paint_id, then NULLs
 * technique_step_id; NULLs technique_instance_id / technique_section_id on the
 * instance's sections; deletes recipe_technique_instances + slot_maps.
 *
 * KEY INVARIANT (SC#3 / FND-03):
 *   recipe_step.id values are NEVER recreated — only FK columns cleared.
 *   unit_recipe_step_progress (keyed by recipe_step_id) survives untouched.
 *
 * CRITICAL ORDERING CONSTRAINT:
 *   Slot maps must be queried and paints baked BEFORE DELETE FROM
 *   recipe_technique_instances fires (which CASCADE-deletes slot_maps).
 *   Reversing order silently destroys all technique colours (T-146-01).
 *
 * SINGLE DB HANDLE CONTRACT (mirrors recipeTechniqueResync.ts lines 22–26):
 *   detachTechniqueInstance MUST receive db from caller and NEVER call getDb()
 *   internally — used inside the delete loop in detachAllAndDeleteTechnique.
 *   tauri-plugin-sql uses sqlx::Pool<Sqlite>; a second getDb() call may land
 *   on a different pool connection and break auto-commit sequencing (T-146-03).
 *
 * detachAllAndDeleteTechnique: calls getDb() ONCE, iterates non-detached
 *   instances, calls detachTechniqueInstance per instance on the SAME handle,
 *   then deletes the technique.
 *
 * getNonDetachedInstanceCount: re-exported from recipeTechniqueResync (the
 *   canonical source); no SQL duplication.
 */

import { getDb } from "@/db/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DbHandle = Awaited<ReturnType<typeof getDb>>;

// ---------------------------------------------------------------------------
// detachTechniqueInstance
// ---------------------------------------------------------------------------

/**
 * Bakes the resolved slot-fill colour into each technique-owned step's
 * paint_id, NULLs FK link columns, and deletes the instance row (CASCADE
 * removes its slot maps). recipe_step.id values are NEVER recreated.
 *
 * MUST receive db from caller — NEVER call getDb() inside this function.
 * NO BEGIN/COMMIT (tauri-plugin-sql auto-commit per statement in WAL mode).
 *
 * SQL ordering (critical):
 *   Step 1 — build slot map         BEFORE any DELETE
 *   Step 2 — bake paint_id          BEFORE Step 5
 *   Step 3 — NULL technique_step_id
 *   Step 4 — NULL section FK columns
 *   Step 5 — DELETE instance row    (CASCADE deletes slot_maps automatically)
 *
 * @param db         - The db handle from the caller (never call getDb() here)
 * @param instanceId - recipe_technique_instances.id to detach
 */
export async function detachTechniqueInstance(
  db: DbHandle,
  instanceId: number,
): Promise<void> {
  // ── Step 1: Build slot resolution map BEFORE any DELETE ─────────────────
  // Joins recipe_steps → recipe_sections → technique_steps → slot_maps.
  // Only technique-owned steps (technique_step_id IS NOT NULL) are included.
  // Left join on slot_maps so unfilled slots produce paint_id = NULL.
  const slotRows = await db.select<{ recipe_step_id: number; paint_id: number | null }[]>(
    `SELECT rs.id AS recipe_step_id, sm.paint_id
     FROM recipe_steps rs
     INNER JOIN recipe_sections sec ON rs.section_id = sec.id
     INNER JOIN technique_steps ts ON rs.technique_step_id = ts.id
     LEFT JOIN recipe_technique_slot_maps sm
       ON sm.instance_id = sec.technique_instance_id
      AND sm.slot_id = ts.colour_slot_id
     WHERE sec.technique_instance_id = $1
       AND rs.technique_step_id IS NOT NULL`,
    [instanceId],
  );

  const slotMap = new Map<number, number | null>(
    slotRows.map((r) => [r.recipe_step_id, r.paint_id]),
  );

  // ── Step 2: Bake resolved paint into each technique-owned step ───────────
  // Must run BEFORE Step 5 (DELETE instance cascades away slot_maps).
  // effectivePaintId collapse for detach context: slot map key present → use value (may be null);
  // key absent → null. Equivalent to: slotMap.get(id) ?? null.
  for (const row of slotRows) {
    const resolvedPaint = slotMap.get(row.recipe_step_id) ?? null;
    await db.execute(
      `UPDATE recipe_steps SET paint_id = $1 WHERE id = $2`,
      [resolvedPaint, row.recipe_step_id],
    );
  }

  // ── Step 3: NULL technique_step_id on technique-owned steps ─────────────
  // Filter by technique_step_id IS NOT NULL to skip manual user-added steps.
  await db.execute(
    `UPDATE recipe_steps
     SET technique_step_id = NULL
     WHERE section_id IN (
       SELECT id FROM recipe_sections WHERE technique_instance_id = $1
     )
     AND technique_step_id IS NOT NULL`,
    [instanceId],
  );

  // ── Step 4: NULL section FK columns ─────────────────────────────────────
  // Belt-and-suspenders before Step 5 (ON DELETE SET NULL would fire anyway,
  // but explicit NULL ensures intent is clear and ordering is auditable).
  await db.execute(
    `UPDATE recipe_sections
     SET technique_instance_id = NULL, technique_section_id = NULL
     WHERE technique_instance_id = $1`,
    [instanceId],
  );

  // ── Step 5: Delete instance row ──────────────────────────────────────────
  // ON DELETE CASCADE fires on recipe_technique_slot_maps (instance_id FK).
  // recipe_sections and recipe_steps rows survive (SET NULL / no cascade to steps).
  await db.execute(
    `DELETE FROM recipe_technique_instances WHERE id = $1`,
    [instanceId],
  );
}

// ---------------------------------------------------------------------------
// detachAllAndDeleteTechnique
// ---------------------------------------------------------------------------

/**
 * Auto-detaches every non-detached instance for the technique (baking paints
 * and clearing FK links), then deletes the technique row.
 *
 * Calls getDb() ONCE and passes the SAME handle to every detachTechniqueInstance
 * call and the final technique DELETE (single-db-handle contract, T-146-03).
 *
 * ON DELETE CASCADE from techniques → technique_sections → technique_steps fires
 * after the DELETE below. recipe_technique_instances rows are already deleted by
 * detachTechniqueInstance, so no double-delete occurs.
 *
 * @param techniqueId - techniques.id to auto-detach and delete
 */
export async function detachAllAndDeleteTechnique(techniqueId: number): Promise<void> {
  const db = await getDb(); // ONE handle for the entire operation

  // Query non-detached instances BEFORE deleting them
  const instances = await db.select<{ id: number }[]>(
    `SELECT id FROM recipe_technique_instances
     WHERE technique_id = $1 AND detached = 0`,
    [techniqueId],
  );

  // Detach each instance: bakes paints, clears FKs, deletes instance + slot maps
  for (const inst of instances) {
    await detachTechniqueInstance(db, inst.id);
  }

  // Now safe to delete the technique (cascade removes technique_sections / steps / slots)
  await db.execute(
    `DELETE FROM techniques WHERE id = $1`,
    [techniqueId],
  );
}

// ---------------------------------------------------------------------------
// getNonDetachedInstanceCount — re-export from canonical source
// ---------------------------------------------------------------------------

// Re-exported so callers can import the detach trio from one cohesive module.
// SQL lives in recipeTechniqueResync.ts — no duplication.
export { getNonDetachedInstanceCount } from "./recipeTechniqueResync";
