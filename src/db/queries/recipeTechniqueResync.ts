/**
 * Recipe Technique Resync — live-link resync engine (v0.7.0 Phase 144).
 *
 * resyncTechniqueInstances: propagates a technique's current section/step structure
 * to every non-detached recipe_technique_instances row for that technique. Called
 * by saveTechniqueGraph immediately after it finishes writing the technique's own
 * sections/steps, on the SAME db handle.
 *
 * KEY INVARIANTS (FND-03 / LINK-01):
 *   - Surviving technique steps: matched by technique_step_id → UPDATE recipe_steps by PK
 *     (never DELETE+INSERT — that would cascade-delete unit_recipe_step_progress)
 *   - Added technique steps:    INSERT new recipe_steps (paint_id NULL, technique_step_id set)
 *   - Removed technique steps:  their recipe_steps.technique_step_id was SET NULL by the FK
 *     on technique_steps DELETE; the resync cleans up those orphaned rows with an explicit
 *     DELETE, then ON DELETE CASCADE on unit_recipe_step_progress fires automatically.
 *   - Cross-section step moves: the instance-wide lookup (Pitfall 5) ensures a step moved
 *     between technique_sections is UPDATEd (section_id + order_index) not DELETE+INSERTed.
 *   - Detached instances (detached=1): skipped entirely.
 *
 * SINGLE DB HANDLE CONTRACT (SC#4):
 *   resyncTechniqueInstances receives `db` from saveTechniqueGraph and NEVER calls getDb()
 *   internally. tauri-plugin-sql uses sqlx::Pool<Sqlite>; a second getDb() call may land on
 *   a different pool connection and break the auto-commit sequencing.
 *
 * getNonDetachedInstanceCount: standalone query (not embedded in saveTechniqueGraph) —
 *   this function MAY call getDb() and is used by the confirmation dialog.
 */

import { getDb } from "@/db/client";

// ---------------------------------------------------------------------------
// Types (minimal — only what resync needs)
// ---------------------------------------------------------------------------

interface TechniqueSection {
  id: number;
  technique_id: number;
  name: string;
  surface: string | null;
  optional: number;
  order_index: number;
  notes: string | null;
}

interface TechniqueStep {
  id: number;
  technique_section_id: number;
  colour_slot_id: number | null;
  step_name: string;
  order_index: number;
  notes: string | null;
  painting_phase: string | null;
  tool: string | null;
  technique: string | null;
  dilution: string | null;
  time_estimate_minutes: number | null;
}

interface RecipeTechniqueInstance {
  id: number;
  recipe_id: number;
}

interface RecipeSection {
  id: number;
  order_index: number;
  technique_section_id: number | null;
}

interface RecipeStepInfo {
  id: number;
  technique_step_id: number | null;
  section_id: number;
  order_index: number;
}

type DbHandle = Awaited<ReturnType<typeof getDb>>;

// ---------------------------------------------------------------------------
// resyncTechniqueInstances
// ---------------------------------------------------------------------------

/**
 * Propagates the technique's current section/step structure to every non-detached
 * recipe_technique_instances row.
 *
 * MUST receive the db handle from the caller — NEVER call getDb() inside this function.
 * NO BEGIN/COMMIT (tauri-plugin-sql auto-commit per statement in WAL mode).
 *
 * @param db         - The db handle from saveTechniqueGraph (or test bridge)
 * @param techniqueId - The technique whose instances must be synced
 */
export async function resyncTechniqueInstances(
  db: DbHandle,
  techniqueId: number,
): Promise<void> {
  // ── 1. Load all non-detached instances for this technique ─────────────────

  const instances = await db.select<RecipeTechniqueInstance[]>(
    `SELECT id, recipe_id FROM recipe_technique_instances
     WHERE technique_id = $1 AND detached = 0
     ORDER BY id ASC`,
    [techniqueId],
  );

  if (instances.length === 0) return;

  // ── 2. Load the (now-saved) technique sections ────────────────────────────

  const techniqueSections = await db.select<TechniqueSection[]>(
    `SELECT id, technique_id, name, surface, optional, order_index, notes
     FROM technique_sections
     WHERE technique_id = $1
     ORDER BY order_index ASC`,
    [techniqueId],
  );

  // Build a set of current technique_section IDs for fast membership check
  const currentTechSectionIds = new Set(techniqueSections.map((ts) => ts.id));

  // ── 3. Load ALL current technique_steps for this technique (all sections) ─

  const allTechniqueSteps = await db.select<TechniqueStep[]>(
    `SELECT id, technique_section_id, colour_slot_id, step_name, order_index,
            notes, painting_phase, tool, technique, dilution, time_estimate_minutes
     FROM technique_steps
     WHERE technique_section_id IN (
       SELECT id FROM technique_sections WHERE technique_id = $1
     )
     ORDER BY technique_section_id ASC, order_index ASC`,
    [techniqueId],
  );

  // Build a set of current technique_step IDs for fast membership check
  const currentTechStepIds = new Set(allTechniqueSteps.map((ts) => ts.id));

  // Build a per-section lookup: technique_section_id → ordered TechniqueStep[]
  const stepsByTechSection = new Map<number, TechniqueStep[]>();
  for (const ts of allTechniqueSteps) {
    const list = stepsByTechSection.get(ts.technique_section_id) ?? [];
    list.push(ts);
    stepsByTechSection.set(ts.technique_section_id, list);
  }

  // ── 4. Per-instance sync ───────────────────────────────────────────────────

  for (const instance of instances) {
    await syncInstance(db, instance, techniqueId, techniqueSections, currentTechSectionIds, stepsByTechSection, currentTechStepIds);
  }
}

async function syncInstance(
  db: DbHandle,
  instance: RecipeTechniqueInstance,
  _techniqueId: number,
  techniqueSections: TechniqueSection[],
  currentTechSectionIds: Set<number>,
  stepsByTechSection: Map<number, TechniqueStep[]>,
  currentTechStepIds: Set<number>,
): Promise<void> {
  // ── 4a. Load recipe_sections for this instance (ordered) ──────────────────

  const recipeSections = await db.select<RecipeSection[]>(
    `SELECT id, order_index, technique_section_id
     FROM recipe_sections
     WHERE technique_instance_id = $1
     ORDER BY order_index ASC`,
    [instance.id],
  );

  // Build a lookup: technique_section_id → recipe_section.id
  const recipeSectionByTechSectionId = new Map<number, number>();
  for (const rs of recipeSections) {
    if (rs.technique_section_id !== null) {
      recipeSectionByTechSectionId.set(rs.technique_section_id, rs.id);
    }
  }

  // ── 4b. Section sync: delete removed, insert added, update surviving ───────

  // DELETE recipe_sections whose technique_section_id is no longer in the technique
  for (const rs of recipeSections) {
    if (rs.technique_section_id !== null && !currentTechSectionIds.has(rs.technique_section_id)) {
      await db.execute(
        `DELETE FROM recipe_sections WHERE id = $1`,
        [rs.id],
      );
      recipeSectionByTechSectionId.delete(rs.technique_section_id);
    }
  }

  // INSERT new recipe_sections for added technique_sections
  for (let si = 0; si < techniqueSections.length; si++) {
    const techSec = techniqueSections[si];
    if (!recipeSectionByTechSectionId.has(techSec.id)) {
      const sectionResult = await db.execute(
        `INSERT INTO recipe_sections
         (recipe_id, name, surface, optional, order_index, notes, technique_instance_id, technique_section_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          instance.recipe_id,
          techSec.name,
          techSec.surface ?? null,
          techSec.optional,
          si,
          techSec.notes ?? null,
          instance.id,
          techSec.id,
        ],
      );
      if (sectionResult.lastInsertId) {
        recipeSectionByTechSectionId.set(techSec.id, sectionResult.lastInsertId);
      }
    } else {
      // UPDATE order_index for surviving sections
      const recipeSectionId = recipeSectionByTechSectionId.get(techSec.id)!;
      await db.execute(
        `UPDATE recipe_sections SET order_index = $2 WHERE id = $1`,
        [recipeSectionId, si],
      );
    }
  }

  // ── 4c. Instance-wide step lookup (Pitfall 5: cross-section move guard) ───
  //
  // Query ALL recipe_steps for this instance across ALL its sections.
  // Keyed by technique_step_id so a step moved between sections is FOUND and
  // UPDATEd (section_id + order_index) rather than DELETE+INSERTed.

  const allInstanceSteps = await db.select<RecipeStepInfo[]>(
    `SELECT rs.id, rs.technique_step_id, rs.section_id, rs.order_index
     FROM recipe_steps rs
     INNER JOIN recipe_sections sec ON rs.section_id = sec.id
     WHERE sec.technique_instance_id = $1`,
    [instance.id],
  );

  // Build lookup: technique_step_id → { id, section_id }
  const existingByTechStepId = new Map<
    number,
    { id: number; section_id: number }
  >();
  for (const rs of allInstanceSteps) {
    if (rs.technique_step_id !== null) {
      existingByTechStepId.set(rs.technique_step_id, {
        id: rs.id,
        section_id: rs.section_id,
      });
    }
  }

  // ── 4d. DELETE orphaned recipe_steps (technique_step deleted → SET NULL) ──
  //
  // After saveTechniqueGraph deletes a technique_step, the ON DELETE SET NULL on
  // recipe_steps.technique_step_id fires, making the column NULL. The resync must
  // clean up these orphaned rows. We delete recipe_steps in this instance's sections
  // that have technique_step_id IS NULL — those are orphaned technique-owned steps.
  // (User-added manual steps in non-technique sections have technique_step_id = NULL
  // but live in sections without technique_instance_id, so they are not affected.)

  for (const rs of allInstanceSteps) {
    if (rs.technique_step_id === null) {
      // Orphaned technique-owned step — clean up
      await db.execute(
        `DELETE FROM recipe_steps WHERE id = $1`,
        [rs.id],
      );
    }
  }

  // ── 4e. Step sync: UPDATE survivors, INSERT added ─────────────────────────

  for (const techSec of techniqueSections) {
    const recipeSectionId = recipeSectionByTechSectionId.get(techSec.id);
    if (!recipeSectionId) continue; // should not happen after 4b, but be safe

    const techniqueSteps = stepsByTechSection.get(techSec.id) ?? [];

    for (let ti = 0; ti < techniqueSteps.length; ti++) {
      const ts = techniqueSteps[ti];
      const existing = existingByTechStepId.get(ts.id);

      if (existing !== undefined) {
        // SURVIVOR: UPDATE order_index + section_id (cross-section move) + content fields
        // NEVER DELETE+INSERT — that would cascade-delete unit_recipe_step_progress (FND-03)
        await db.execute(
          `UPDATE recipe_steps
           SET order_index = $2,
               section_id = $3,
               step_name = $4,
               notes = $5,
               painting_phase = $6,
               tool = $7,
               technique = $8,
               dilution = $9,
               time_estimate_minutes = $10
           WHERE id = $1`,
          [
            existing.id,
            ti,
            recipeSectionId,
            ts.step_name,
            ts.notes ?? null,
            ts.painting_phase ?? null,
            ts.tool ?? null,
            ts.technique ?? null,
            ts.dilution ?? null,
            ts.time_estimate_minutes ?? null,
          ],
        );
      } else {
        // ADDED step: INSERT new recipe_steps row (paint_id NULL, technique_step_id set)
        // 14-column INSERT mirrors applyTechnique (recipeTechniqueInstances.ts lines 106-128)
        await db.execute(
          `INSERT INTO recipe_steps
           (recipe_id, paint_id, step_name, order_index, notes,
            painting_phase, tool, technique, dilution, time_estimate_minutes,
            step_photo_path, alt_paint_id, section_id, technique_step_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            instance.recipe_id,
            null,               // paint_id = NULL (effectivePaintId spine)
            ts.step_name,
            ti,
            ts.notes ?? null,
            ts.painting_phase ?? null,
            ts.tool ?? null,
            ts.technique ?? null,
            ts.dilution ?? null,
            ts.time_estimate_minutes ?? null,
            null,               // step_photo_path = NULL
            null,               // alt_paint_id = NULL
            recipeSectionId,
            ts.id,              // technique_step_id FK
          ],
        );
      }
    }
  }

  // ── 4f. DELETE recipe_steps for technique_steps no longer in the technique ─
  //
  // Belt-and-suspenders: if any recipe_step still has a technique_step_id pointing
  // to a step that is no longer in the current technique (edge case where SET NULL
  // did not fire — e.g. direct SQL during tests), clean them up explicitly.

  for (const [techStepId, existing] of existingByTechStepId) {
    if (!currentTechStepIds.has(techStepId)) {
      await db.execute(
        `DELETE FROM recipe_steps WHERE id = $1`,
        [existing.id],
      );
    }
  }
}

// ---------------------------------------------------------------------------
// getNonDetachedInstanceCount
// ---------------------------------------------------------------------------

/**
 * Returns the count of non-detached recipe_technique_instances for a technique.
 * Used by the confirmation dialog to display "X recipes will be affected".
 *
 * This function MAY call getDb() — it is a standalone query, not embedded in
 * saveTechniqueGraph.
 *
 * @param techniqueId - The technique to count instances for
 */
export async function getNonDetachedInstanceCount(
  techniqueId: number,
): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ n: number }[]>(
    `SELECT COUNT(*) AS n FROM recipe_technique_instances
     WHERE technique_id = $1 AND detached = 0`,
    [techniqueId],
  );
  return rows[0]?.n ?? 0;
}
