import { getDb } from "@/db/client";
import type {
  Technique,
  TechniqueColourSlot,
  TechniqueSection,
  TechniqueStep,
  TechniqueWithCounts,
  TechniqueUsageCount,
  TechniqueFormValues,
  DraftTechniqueSlot,
  DraftTechniqueSection,
} from "@/types/technique";
import { computeSlotDiff, buildSlotIdMap } from "@/lib/techniqueDiff";
import { resyncTechniqueInstances } from "@/db/queries/recipeTechniqueResync";

// ---------------------------------------------------------------------------
// Internal flat step type for technique step diff (mirrors FlatDraftStep but
// without the recipe-specific fields paint_id / step_photo_path / alt_paint_id
// that are absent from migration 051 technique_steps).
// ---------------------------------------------------------------------------

interface TechniqueFlatStep {
  localId: string;
  dbId: number | null;
  sectionLocalId: string;
  step_name: string;
  colour_slot_id: string | null; // localId ref — resolved via slotIdMap at write time
  notes: string | null;
  painting_phase: string | null;
  tool: string | null;
  technique: string | null;
  dilution: string | null;
  time_estimate_minutes: number | null;
}

/**
 * Flattens DraftTechniqueSection[] steps into a single array with their
 * sectionLocalId, then partitions into toDelete / toUpdate / toInsert.
 *
 * Uses a GLOBAL scan across ALL sections (same pattern as computeStepDiff in
 * recipeDiff.ts) so a step dragged from section A to B is not falsely deleted.
 */
function computeTechniqueStepDiff(
  draftSections: DraftTechniqueSection[],
  existingSteps: TechniqueStep[],
): { toDelete: number[]; toUpdate: TechniqueFlatStep[]; toInsert: TechniqueFlatStep[] } {
  const flatSteps: TechniqueFlatStep[] = draftSections.flatMap((sec) =>
    sec.steps.map((st) => ({
      localId: st.localId,
      dbId: st.dbId,
      sectionLocalId: sec.localId,
      step_name: st.step_name,
      colour_slot_id: st.colour_slot_id,
      notes: st.notes,
      painting_phase: st.painting_phase,
      tool: st.tool,
      technique: st.technique,
      dilution: st.dilution,
      time_estimate_minutes: st.time_estimate_minutes,
    })),
  );

  const survivingDbIds = new Set(
    flatSteps.map((st) => st.dbId).filter((id): id is number => id !== null),
  );

  return {
    toDelete: existingSteps.filter((st) => !survivingDbIds.has(st.id)).map((st) => st.id),
    toUpdate: flatSteps.filter((st) => st.dbId !== null),
    toInsert: flatSteps.filter((st) => st.dbId === null),
  };
}

/**
 * Seeds a localId -> dbId map from the surviving (non-null dbId) sections.
 */
function buildTechniqueSectionIdMap(sections: DraftTechniqueSection[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const sec of sections) {
    if (sec.dbId !== null) {
      map.set(sec.localId, sec.dbId);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Simple reads
// ---------------------------------------------------------------------------

export async function getTechniques(): Promise<Technique[]> {
  const db = await getDb();
  return db.select<Technique[]>("SELECT * FROM techniques ORDER BY name ASC");
}

export async function getTechnique(id: number): Promise<Technique | null> {
  const db = await getDb();
  const rows = await db.select<Technique[]>("SELECT * FROM techniques WHERE id = $1", [id]);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Batch query for card grid display (avoids N+1)
// ---------------------------------------------------------------------------

/**
 * Returns all techniques with slot/step/usage counts in a single JOIN query.
 *
 * CRITICAL: technique_steps has NO technique_id column — step count must be
 * derived by joining technique_steps through technique_sections.
 * A naive GROUP BY on technique_steps.technique_id would fail (no such column).
 */
export async function getTechniquesWithCounts(): Promise<TechniqueWithCounts[]> {
  const db = await getDb();
  return db.select<TechniqueWithCounts[]>(
    `SELECT t.*,
       COALESCE(sl.slot_count, 0) AS slot_count,
       COALESCE(st.step_count, 0) AS step_count,
       COALESCE(u.usage_count, 0) AS usage_count
     FROM techniques t
     LEFT JOIN (
       SELECT technique_id, COUNT(*) AS slot_count
       FROM technique_colour_slots
       GROUP BY technique_id
     ) sl ON sl.technique_id = t.id
     LEFT JOIN (
       SELECT sec.technique_id, COUNT(*) AS step_count
       FROM technique_steps ts
       JOIN technique_sections sec ON sec.id = ts.technique_section_id
       GROUP BY sec.technique_id
     ) st ON st.technique_id = t.id
     LEFT JOIN (
       SELECT technique_id, COUNT(*) AS usage_count
       FROM recipe_technique_instances
       GROUP BY technique_id
     ) u ON u.technique_id = t.id
     ORDER BY t.name ASC`,
    [],
  );
}

// ---------------------------------------------------------------------------
// Usage count queries
// ---------------------------------------------------------------------------

/** Returns per-technique usage counts from recipe_technique_instances. */
export async function getTechniqueUsageCounts(): Promise<TechniqueUsageCount[]> {
  const db = await getDb();
  return db.select<TechniqueUsageCount[]>(
    `SELECT technique_id, COUNT(*) AS usage_count
     FROM recipe_technique_instances
     GROUP BY technique_id`,
    [],
  );
}

/** Returns the usage count for a single technique (for delete dialog). */
export async function getTechniqueUsageCount(id: number): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ n: number }[]>(
    "SELECT COUNT(*) AS n FROM recipe_technique_instances WHERE technique_id = $1",
    [id],
  );
  return rows[0]?.n ?? 0;
}

/** Returns the list of recipes that use a technique (for detail Sheet). */
export async function getTechniqueUsedByRecipes(
  id: number,
): Promise<{ recipe_id: number; name: string }[]> {
  const db = await getDb();
  return db.select<{ recipe_id: number; name: string }[]>(
    `SELECT rti.recipe_id, pr.name
     FROM recipe_technique_instances rti
     JOIN painting_recipes pr ON pr.id = rti.recipe_id
     WHERE rti.technique_id = $1
     ORDER BY pr.name ASC`,
    [id],
  );
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * Deletes a technique. technique_sections, technique_steps, and
 * technique_colour_slots all CASCADE on technique.id deletion.
 */
export async function deleteTechnique(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM techniques WHERE id = $1", [id]);
}

// ---------------------------------------------------------------------------
// Duplicate
// ---------------------------------------------------------------------------

/**
 * TECH-04 — Duplicate a technique with all its slots, sections, and steps.
 *
 * Copies metadata → INSERT slots (build Map<oldSlotId, newSlotId>) →
 * INSERT sections (build Map<oldSectionId, newSectionId>) →
 * INSERT steps (remap colour_slot_id via slotIdMap, section_id via sectionIdMap).
 * Returns the new technique id.
 *
 * NOTE: tauri-plugin-sql uses sqlx::Pool<Sqlite> (connection pool). Each
 * db.execute() may run on a DIFFERENT connection, so explicit BEGIN/COMMIT
 * is broken — the transaction boundary is not shared across calls. We use
 * auto-commit mode instead: in WAL mode each committed write is immediately
 * visible to all connections, so FK constraints on subsequent operations
 * see newly inserted rows.
 */
export async function duplicateTechnique(
  originalId: number,
  newName: string,
): Promise<number> {
  const db = await getDb();

  // 1. Read original technique
  const rows = await db.select<Technique[]>(
    "SELECT * FROM techniques WHERE id = $1",
    [originalId],
  );
  const original = rows[0];
  if (!original) throw new Error("Technique not found");

  // 2. Insert technique copy (all metadata fields, new name)
  const techResult = await db.execute(
    `INSERT INTO techniques (name, effect, difficulty, notes)
     VALUES ($1, $2, $3, $4)`,
    [newName, original.effect, original.difficulty, original.notes],
  );
  const newTechniqueId = techResult.lastInsertId ?? 0;

  // 3. Read + copy colour slots — build Map<oldSlotId, newSlotId>
  const originalSlots = await db.select<TechniqueColourSlot[]>(
    "SELECT * FROM technique_colour_slots WHERE technique_id = $1 ORDER BY order_index ASC",
    [originalId],
  );
  const slotIdMap = new Map<number, number>();
  for (const slot of originalSlots) {
    const slotResult = await db.execute(
      `INSERT INTO technique_colour_slots (technique_id, name, role_hint, order_index)
       VALUES ($1, $2, $3, $4)`,
      [newTechniqueId, slot.name, slot.role_hint, slot.order_index],
    );
    slotIdMap.set(slot.id, slotResult.lastInsertId ?? 0);
  }

  // 4. Read + copy sections — build Map<oldSectionId, newSectionId>
  const originalSections = await db.select<TechniqueSection[]>(
    "SELECT * FROM technique_sections WHERE technique_id = $1 ORDER BY order_index ASC",
    [originalId],
  );
  const sectionIdMap = new Map<number, number>();
  for (const section of originalSections) {
    const sectionResult = await db.execute(
      `INSERT INTO technique_sections (technique_id, name, surface, optional, order_index, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        newTechniqueId,
        section.name,
        section.surface,
        section.optional,
        section.order_index,
        section.notes,
      ],
    );
    sectionIdMap.set(section.id, sectionResult.lastInsertId ?? 0);
  }

  // 5. Read all steps (joined through sections) + copy with remapped IDs
  const originalSteps = await db.select<TechniqueStep[]>(
    `SELECT ts.*
     FROM technique_steps ts
     JOIN technique_sections sec ON sec.id = ts.technique_section_id
     WHERE sec.technique_id = $1
     ORDER BY sec.order_index ASC, ts.order_index ASC`,
    [originalId],
  );
  for (const step of originalSteps) {
    const remappedSectionId = sectionIdMap.get(step.technique_section_id) ?? null;
    const remappedSlotId =
      step.colour_slot_id !== null ? (slotIdMap.get(step.colour_slot_id) ?? null) : null;

    await db.execute(
      `INSERT INTO technique_steps
       (technique_section_id, colour_slot_id, step_name, order_index, notes,
        painting_phase, tool, technique, dilution, time_estimate_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        remappedSectionId,
        remappedSlotId,
        step.step_name,
        step.order_index,
        step.notes,
        step.painting_phase,
        step.tool,
        step.technique,
        step.dilution,
        step.time_estimate_minutes,
      ],
    );
  }

  return newTechniqueId;
}

// ---------------------------------------------------------------------------
// saveTechniqueGraph — non-destructive graph save (FND-03 invariant)
// ---------------------------------------------------------------------------

/**
 * DI-03 — Atomic save of a complete technique graph (metadata + slots + sections + steps).
 *
 * Executes the full diff with auto-commit per statement.
 * On any error mid-save, the error is re-thrown so the calling hook can show a toast.
 *
 * NOTE: tauri-plugin-sql uses sqlx::Pool<Sqlite> (connection pool). Each
 * db.execute() may run on a DIFFERENT connection from the pool, so explicit
 * BEGIN TRANSACTION / COMMIT / ROLLBACK is broken — the transaction boundary
 * is not shared across calls. We use auto-commit mode instead: in WAL mode
 * each committed write is immediately visible to all connections, so FK
 * constraints on subsequent operations see newly inserted rows.
 *
 * Handles both create (techniqueId === null) and edit (techniqueId !== null) paths:
 *   - Create: INSERT technique → INSERT slots → INSERT sections → INSERT steps
 *   - Edit: UPDATE technique → slot diff → section diff → step diff (UPDATE-by-PK
 *     for surviving steps — NEVER DELETE+INSERT a surviving step, FND-03 invariant).
 *
 * COLUMN TRAPS (migration 051):
 * - technique_colour_slots: NO updated_at — do NOT include in UPDATE SQL
 * - technique_steps: NO updated_at, NO step_photo_path, NO alt_paint_id — omit all three
 * - Only techniques and technique_sections carry updated_at
 *
 * All SQL uses $1/$2 positional parameters — no string interpolation of user input.
 */
export async function saveTechniqueGraph(
  techniqueId: number | null,
  formValues: TechniqueFormValues,
  slots: DraftTechniqueSlot[],
  sections: DraftTechniqueSection[],
  existingSlots: TechniqueColourSlot[],
  existingSections: TechniqueSection[],
  existingSteps: TechniqueStep[],
): Promise<number> {
  // Validate before touching the DB
  if (!formValues.name || formValues.name.trim().length === 0) {
    throw new Error("Technique name is required.");
  }
  const totalSteps = sections.flatMap((s) => s.steps).length;
  if (totalSteps === 0) {
    throw new Error("A technique must have at least one step.");
  }

  const db = await getDb();
  let finalId: number;

  if (techniqueId === null) {
    // -----------------------------------------------------------------------
    // CREATE PATH — INSERT technique row
    // -----------------------------------------------------------------------
    const techResult = await db.execute(
      `INSERT INTO techniques (name, effect, difficulty, notes)
       VALUES ($1, $2, $3, $4)`,
      [
        formValues.name,
        formValues.effect ?? null,
        formValues.difficulty ?? null,
        formValues.notes ?? null,
      ],
    );
    finalId = techResult.lastInsertId ?? 0;

    // INSERT colour slots and build slotIdMap (localId -> DB id)
    const slotIdMap = new Map<string, number>();
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const slotResult = await db.execute(
        `INSERT INTO technique_colour_slots (technique_id, name, role_hint, order_index)
         VALUES ($1, $2, $3, $4)`,
        [finalId, slot.name, slot.role_hint ?? null, i],
      );
      slotIdMap.set(slot.localId, slotResult.lastInsertId ?? 0);
    }

    // INSERT sections and build sectionIdMap (localId -> DB id)
    const sectionIdMap = new Map<string, number>();
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const sectionResult = await db.execute(
        `INSERT INTO technique_sections (technique_id, name, surface, optional, order_index, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          finalId,
          sec.name,
          sec.surface ?? null,
          sec.optional,
          i,
          sec.notes ?? null,
        ],
      );
      sectionIdMap.set(sec.localId, sectionResult.lastInsertId ?? 0);
    }

    // INSERT steps, resolving section FK + slot FK
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const resolvedSectionId = sectionIdMap.get(sec.localId) ?? null;
      for (let j = 0; j < sec.steps.length; j++) {
        const step = sec.steps[j];
        const resolvedSlotId =
          step.colour_slot_id !== null && step.colour_slot_id !== "__none__"
            ? (slotIdMap.get(step.colour_slot_id) ?? null)
            : null;
        await db.execute(
          `INSERT INTO technique_steps
           (technique_section_id, colour_slot_id, step_name, order_index, notes,
            painting_phase, tool, technique, dilution, time_estimate_minutes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            resolvedSectionId,
            resolvedSlotId,
            step.step_name,
            j,
            step.notes ?? null,
            step.painting_phase ?? null,
            step.tool ?? null,
            step.technique ?? null,
            step.dilution ?? null,
            step.time_estimate_minutes ?? null,
          ],
        );
      }
    }
  } else {
    // -----------------------------------------------------------------------
    // EDIT PATH — UPDATE technique row
    // -----------------------------------------------------------------------
    await db.execute(
      `UPDATE techniques
       SET name       = $2,
           effect     = $3,
           difficulty = $4,
           notes      = $5,
           updated_at = datetime('now')
       WHERE id = $1`,
      [
        techniqueId,
        formValues.name,
        formValues.effect ?? null,
        formValues.difficulty ?? null,
        formValues.notes ?? null,
      ],
    );
    finalId = techniqueId;

    // SLOT PHASE — diff and reconcile colour slots
    const {
      toDelete: slotsToDelete,
      toUpdate: slotsToUpdate,
      toInsert: slotsToInsert,
    } = computeSlotDiff(slots, existingSlots);

    // DELETE removed slots (ON DELETE SET NULL nulls referencing steps' colour_slot_id)
    for (const id of slotsToDelete) {
      await db.execute("DELETE FROM technique_colour_slots WHERE id = $1", [id]);
    }

    // UPDATE existing slots (NO updated_at on technique_colour_slots — migration 051)
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slotsToUpdate.includes(slot)) continue;
      await db.execute(
        `UPDATE technique_colour_slots
         SET name       = $2,
             role_hint  = $3,
             order_index = $4
         WHERE id = $1`,
        [slot.dbId, slot.name, slot.role_hint ?? null, i],
      );
    }

    // INSERT new slots and extend slotIdMap
    const slotIdMap = buildSlotIdMap(slots);
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slotsToInsert.includes(slot)) continue;
      const slotResult = await db.execute(
        `INSERT INTO technique_colour_slots (technique_id, name, role_hint, order_index)
         VALUES ($1, $2, $3, $4)`,
        [finalId, slot.name, slot.role_hint ?? null, i],
      );
      slotIdMap.set(slot.localId, slotResult.lastInsertId ?? 0);
    }

    // SECTION PHASE — compute section diff
    const survivingSectionDbIds = new Set(
      sections.map((s) => s.dbId).filter((id): id is number => id !== null),
    );
    const sectionsToDelete = existingSections
      .filter((s) => !survivingSectionDbIds.has(s.id))
      .map((s) => s.id);
    const sectionsToUpdate = sections.filter((s) => s.dbId !== null);
    const sectionsToInsert = sections.filter((s) => s.dbId === null);

    // DELETE removed sections (ON DELETE CASCADE removes their steps)
    for (const id of sectionsToDelete) {
      await db.execute("DELETE FROM technique_sections WHERE id = $1", [id]);
    }

    // UPDATE existing sections (technique_sections HAS updated_at — migration 051)
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      if (!sectionsToUpdate.includes(sec)) continue;
      await db.execute(
        `UPDATE technique_sections
         SET name        = $2,
             surface     = $3,
             optional    = $4,
             order_index = $5,
             notes       = $6,
             updated_at  = datetime('now')
         WHERE id = $1`,
        [
          sec.dbId,
          sec.name,
          sec.surface ?? null,
          sec.optional,
          i,
          sec.notes ?? null,
        ],
      );
    }

    // INSERT new sections and build sectionIdMap from survivors + new
    const sectionIdMap = buildTechniqueSectionIdMap(sections);
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      if (!sectionsToInsert.includes(sec)) continue;
      const sectionResult = await db.execute(
        `INSERT INTO technique_sections (technique_id, name, surface, optional, order_index, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          finalId,
          sec.name,
          sec.surface ?? null,
          sec.optional,
          i,
          sec.notes ?? null,
        ],
      );
      sectionIdMap.set(sec.localId, sectionResult.lastInsertId ?? 0);
    }

    // STEP PHASE — compute step diff (global scan across ALL sections)
    const { toDelete: stepsToDelete, toUpdate: stepsToUpdate, toInsert: stepsToInsert }
      = computeTechniqueStepDiff(sections, existingSteps);

    // DELETE removed steps
    for (const id of stepsToDelete) {
      await db.execute("DELETE FROM technique_steps WHERE id = $1", [id]);
    }

    // Build per-section step order map for correct order_index assignment
    const sectionStepCounters = new Map<string, number>();

    // UPDATE surviving steps by PK (FND-03: NEVER DELETE+INSERT a surviving step)
    // NO updated_at on technique_steps — migration 051
    for (const step of stepsToUpdate) {
      const resolvedSectionId = sectionIdMap.get(step.sectionLocalId) ?? null;
      const resolvedSlotId =
        step.colour_slot_id !== null && step.colour_slot_id !== "__none__"
          ? (slotIdMap.get(step.colour_slot_id) ?? null)
          : null;
      // Compute order_index within the section
      const counter = sectionStepCounters.get(step.sectionLocalId) ?? 0;
      sectionStepCounters.set(step.sectionLocalId, counter + 1);

      await db.execute(
        `UPDATE technique_steps
         SET step_name             = $2,
             order_index           = $3,
             notes                 = $4,
             painting_phase        = $5,
             tool                  = $6,
             technique             = $7,
             dilution              = $8,
             time_estimate_minutes = $9,
             technique_section_id  = $10,
             colour_slot_id        = $11
         WHERE id = $1`,
        [
          step.dbId,
          step.step_name,
          counter,
          step.notes ?? null,
          step.painting_phase ?? null,
          step.tool ?? null,
          step.technique ?? null,
          step.dilution ?? null,
          step.time_estimate_minutes ?? null,
          resolvedSectionId,
          resolvedSlotId,
        ],
      );
    }

    // INSERT new steps
    for (const step of stepsToInsert) {
      const resolvedSectionId = sectionIdMap.get(step.sectionLocalId) ?? null;
      const resolvedSlotId =
        step.colour_slot_id !== null && step.colour_slot_id !== "__none__"
          ? (slotIdMap.get(step.colour_slot_id) ?? null)
          : null;
      const counter = sectionStepCounters.get(step.sectionLocalId) ?? 0;
      sectionStepCounters.set(step.sectionLocalId, counter + 1);

      await db.execute(
        `INSERT INTO technique_steps
         (technique_section_id, colour_slot_id, step_name, order_index, notes,
          painting_phase, tool, technique, dilution, time_estimate_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          resolvedSectionId,
          resolvedSlotId,
          step.step_name,
          counter,
          step.notes ?? null,
          step.painting_phase ?? null,
          step.tool ?? null,
          step.technique ?? null,
          step.dilution ?? null,
          step.time_estimate_minutes ?? null,
        ],
      );
    }

    // RESYNC: propagate the saved technique structure to all linked recipe instances.
    // Called with the SAME db handle (SC#4 — no second getDb() call, no BEGIN).
    // Only runs in the edit branch — on create there are no instances yet.
    await resyncTechniqueInstances(db, finalId);
  }

  return finalId;
}
