/**
 * Recipe Technique Instances — apply flow (v0.7.0 Phase 143).
 *
 * Materialises a technique application into the recipe graph:
 *   1. INSERT a fresh recipe_technique_instances row (always — SLOT-04).
 *   2. SELECT technique_sections ordered by order_index.
 *   3. For each section: INSERT recipe_sections with technique_instance_id set;
 *      SELECT + INSERT technique_steps as recipe_steps with paint_id = NULL.
 *   4. INSERT OR REPLACE recipe_technique_slot_maps from slotFills.
 *
 * SLOT-03: each instance's slot map is independent (separate instance rows).
 * SLOT-04: applying the same technique twice creates two distinct instances.
 *
 * Shape mirrors duplicateTechnique (src/db/queries/techniques.ts lines 206–307):
 * single const db = await getDb(); sequential await db.execute() INSERTs;
 * lastInsertId chaining; NO BEGIN/COMMIT/ROLLBACK.
 */

import { getDb } from "@/db/client";
import type { TechniqueSection, TechniqueStep } from "@/types/technique";

// ---------------------------------------------------------------------------
// Entity interface
// ---------------------------------------------------------------------------

export interface RecipeTechniqueInstance {
  id: number;
  recipe_id: number;
  technique_id: number;
  detached: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// applyTechnique — insert-only materialise
// ---------------------------------------------------------------------------

/**
 * Apply a technique to a recipe: materialise a new recipe_technique_instances row,
 * insert recipe_sections rows (one per technique_section) with technique_instance_id
 * set, insert recipe_steps rows with technique_step_id set and paint_id NULL, and
 * populate recipe_technique_slot_maps from slotFills.
 *
 * Returns the new recipe_technique_instances.id (instanceId).
 *
 * @param recipeId                Target recipe
 * @param techniqueId             Technique to apply
 * @param insertAfterSectionIndex 0-based index; new sections start at this order_index
 * @param slotFills               Map<slotId, paintId|null> — pre-fills; missing = unfilled
 */
export async function applyTechnique(
  recipeId: number,
  techniqueId: number,
  insertAfterSectionIndex: number,
  slotFills: Map<number, number | null>,
): Promise<number> {
  const db = await getDb();

  // 1. INSERT a fresh recipe_technique_instances row — ALWAYS, no SELECT-or-reuse (SLOT-04)
  const instanceResult = await db.execute(
    `INSERT INTO recipe_technique_instances (recipe_id, technique_id)
     VALUES ($1, $2)`,
    [recipeId, techniqueId],
  );
  const instanceId = instanceResult.lastInsertId ?? 0;

  // 2. SELECT technique_sections ordered by order_index ASC
  const sections = await db.select<TechniqueSection[]>(
    `SELECT * FROM technique_sections WHERE technique_id = $1 ORDER BY order_index ASC`,
    [techniqueId],
  );

  // 3. For each technique_section: INSERT recipe_sections + steps
  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];

    // 3a. INSERT recipe_sections with technique_instance_id set
    const sectionResult = await db.execute(
      `INSERT INTO recipe_sections
       (recipe_id, name, surface, optional, order_index, notes, technique_instance_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        recipeId,
        section.name,
        section.surface ?? null,
        section.optional,
        insertAfterSectionIndex + si,
        section.notes ?? null,
        instanceId,
      ],
    );
    const newSectionId = sectionResult.lastInsertId ?? 0;

    // 3b. SELECT technique_steps for this section
    const steps = await db.select<TechniqueStep[]>(
      `SELECT * FROM technique_steps WHERE technique_section_id = $1 ORDER BY order_index ASC`,
      [section.id],
    );

    // 3c. INSERT each step as recipe_steps with paint_id = NULL (T-143-03 / Pitfall 5)
    for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
      const step = steps[stepIdx];
      await db.execute(
        `INSERT INTO recipe_steps
         (recipe_id, paint_id, step_name, order_index, notes,
          painting_phase, tool, technique, dilution, time_estimate_minutes,
          step_photo_path, alt_paint_id, section_id, technique_step_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          recipeId,
          null,         // paint_id = NULL — always (effectivePaintId spine)
          step.step_name,
          stepIdx,      // order_index within section
          step.notes ?? null,
          step.painting_phase ?? null,
          step.tool ?? null,
          step.technique ?? null,
          step.dilution ?? null,
          step.time_estimate_minutes ?? null,
          null,         // step_photo_path = NULL (TechniqueStep has none)
          null,         // alt_paint_id = NULL (TechniqueStep has none)
          newSectionId,
          step.id,      // technique_step_id — FK link to technique_steps
        ],
      );
    }
  }

  // 4. INSERT OR REPLACE slot fills (UNIQUE(instance_id, slot_id) makes REPLACE safe)
  for (const [slotId, paintId] of slotFills) {
    await db.execute(
      `INSERT OR REPLACE INTO recipe_technique_slot_maps (instance_id, slot_id, paint_id)
       VALUES ($1, $2, $3)`,
      [instanceId, slotId, paintId ?? null],
    );
  }

  return instanceId;
}

// ---------------------------------------------------------------------------
// getInstancesForRecipe — list all instances for a recipe
// ---------------------------------------------------------------------------

export async function getInstancesForRecipe(
  recipeId: number,
): Promise<RecipeTechniqueInstance[]> {
  const db = await getDb();
  return db.select<RecipeTechniqueInstance[]>(
    `SELECT * FROM recipe_technique_instances WHERE recipe_id = $1 ORDER BY id ASC`,
    [recipeId],
  );
}
