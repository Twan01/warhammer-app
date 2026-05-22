import { getDb } from "@/db/client";
import type { PaintingRecipe, CreateRecipeInput, UpdateRecipeInput } from "@/types/recipe";
import type { RecipeStep } from "@/types/recipePaint";
import type { RecipeSection } from "@/types/recipeSection";
import type { DraftSection } from "@/features/recipes/recipeSection";
import type { RecipeFormValues } from "@/features/recipes/recipeSchema";
import { computeSectionDiff, computeStepDiff, buildSectionIdMap } from "@/features/recipes/recipeDiff";
import { computeOrderIndex } from "@/features/recipes/recipeSteps";

export async function getRecipes(): Promise<PaintingRecipe[]> {
  const db = await getDb();
  return db.select<PaintingRecipe[]>("SELECT * FROM painting_recipes ORDER BY name ASC");
}

export async function getRecipeById(id: number): Promise<PaintingRecipe | null> {
  const db = await getDb();
  const rows = await db.select<PaintingRecipe[]>("SELECT * FROM painting_recipes WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createRecipe(input: CreateRecipeInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO painting_recipes (
       name, faction_id, unit_id, area,
       primer, basecoat, shade, layer, highlight, glaze_filter,
       weathering, technical, basing, notes, tutorial_link,
       style, surface, effect, difficulty, estimated_minutes, result_photo_path
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7, $8, $9, $10,
       $11, $12, $13, $14, $15,
       $16, $17, $18, $19, $20, $21
     )`,
    [
      input.name, input.faction_id ?? null, input.unit_id ?? null, input.area ?? null,
      input.primer ?? null, input.basecoat ?? null, input.shade ?? null, input.layer ?? null,
      input.highlight ?? null, input.glaze_filter ?? null,
      input.weathering ?? null, input.technical ?? null, input.basing ?? null,
      input.notes ?? null, input.tutorial_link ?? null,
      input.style ?? null, input.surface ?? null, input.effect ?? null,
      input.difficulty ?? null, input.estimated_minutes ?? null, input.result_photo_path ?? null,
    ]
  );
  return result.lastInsertId ?? 0;
}

export async function updateRecipe(input: UpdateRecipeInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE painting_recipes
        SET name              = COALESCE($2, name),
            faction_id        = $3,
            unit_id           = $4,
            area              = $5,
            primer            = $6,
            basecoat          = $7,
            shade             = $8,
            layer             = $9,
            highlight         = $10,
            glaze_filter      = $11,
            weathering        = $12,
            technical         = $13,
            basing            = $14,
            notes             = $15,
            tutorial_link     = $16,
            style             = $17,
            surface           = $18,
            effect            = $19,
            difficulty        = $20,
            estimated_minutes = $21,
            result_photo_path = $22,
            updated_at        = datetime('now')
      WHERE id = $1`,
    [
      input.id,
      input.name ?? null, input.faction_id ?? null, input.unit_id ?? null, input.area ?? null,
      input.primer ?? null, input.basecoat ?? null, input.shade ?? null, input.layer ?? null,
      input.highlight ?? null, input.glaze_filter ?? null,
      input.weathering ?? null, input.technical ?? null, input.basing ?? null,
      input.notes ?? null, input.tutorial_link ?? null,
      input.style ?? null, input.surface ?? null, input.effect ?? null,
      input.difficulty ?? null, input.estimated_minutes ?? null, input.result_photo_path ?? null,
    ]
  );
}

export async function deleteRecipe(id: number): Promise<void> {
  const db = await getDb();
  // recipe_steps.recipe_id uses CASCADE — linked steps removed automatically
  await db.execute("DELETE FROM painting_recipes WHERE id = $1", [id]);
}

/**
 * PROJ-01 — batch recipe name lookup for a set of unit IDs.
 * Only returns recipes where unit_id matches — faction-wide recipes
 * (unit_id IS NULL) are excluded because they are not unit-specific.
 * Uses dynamic positional params for IN clause (Pitfall 3).
 */
export async function getRecipeNamesByUnitIds(
  unitIds: number[]
): Promise<{ id: number; unit_id: number; name: string }[]> {
  if (unitIds.length === 0) return [];
  const db = await getDb();
  const placeholders = unitIds.map((_, i) => `$${i + 1}`).join(", ");
  return db.select(
    `SELECT id, unit_id, name FROM painting_recipes WHERE unit_id IN (${placeholders})`,
    unitIds
  );
}

/**
 * STUDIO-03 — duplicate a recipe with all its steps and sections.
 *
 * Copies all 21 metadata fields from the original recipe (using newName for the
 * name field), then copies all sections (INTG-01 section copy pass) building a
 * Map<oldSectionId, newSectionId> for ID remapping, then copies all steps with
 * all 13 columns including section_id (remapped via sectionIdMap).
 * Returns the new recipe's ID.
 */
export async function duplicateRecipe(originalId: number, newName: string): Promise<number> {
  const db = await getDb();

  // 1. Read original recipe
  const rows = await db.select<PaintingRecipe[]>(
    "SELECT * FROM painting_recipes WHERE id = $1", [originalId]
  );
  const original = rows[0];
  if (!original) throw new Error("Recipe not found");

  await db.execute("BEGIN TRANSACTION", []);
  try {

  // 2. Insert recipe copy (all 21 metadata fields copied, new name)
  const result = await db.execute(
    `INSERT INTO painting_recipes (
       name, faction_id, unit_id, area,
       primer, basecoat, shade, layer, highlight, glaze_filter,
       weathering, technical, basing, notes, tutorial_link,
       style, surface, effect, difficulty, estimated_minutes, result_photo_path
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
     )`,
    [
      newName, original.faction_id, original.unit_id, original.area,
      original.primer, original.basecoat, original.shade, original.layer,
      original.highlight, original.glaze_filter, original.weathering,
      original.technical, original.basing, original.notes, original.tutorial_link,
      original.style, original.surface, original.effect, original.difficulty,
      original.estimated_minutes, original.result_photo_path,
    ]
  );
  const newRecipeId = result.lastInsertId ?? 0;

  // 3. Read original sections (INTG-01 section copy pass)
  const sections = await db.select<RecipeSection[]>(
    "SELECT * FROM recipe_sections WHERE recipe_id = $1 ORDER BY order_index ASC",
    [originalId]
  );

  // 4. Copy sections and build old->new ID map
  const sectionIdMap = new Map<number, number>();
  for (const section of sections) {
    const sectionResult = await db.execute(
      `INSERT INTO recipe_sections (recipe_id, name, surface, optional, order_index, notes, section_type, technique, execution_mode, applies_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [newRecipeId, section.name, section.surface, section.optional, section.order_index, section.notes ?? null,
       section.section_type ?? null, section.technique ?? null, section.execution_mode ?? null, section.applies_to ?? null]
    );
    sectionIdMap.set(section.id, sectionResult.lastInsertId ?? 0);
  }

  // 5. Read original steps
  const steps = await db.select<RecipeStep[]>(
    `SELECT rs.* FROM recipe_steps rs
     LEFT JOIN recipe_sections s ON s.id = rs.section_id
     WHERE rs.recipe_id = $1
     ORDER BY COALESCE(s.order_index, 999999) ASC, rs.order_index ASC`,
    [originalId]
  );

  // 6. Copy each step to the new recipe (all 13 columns including section_id remapped via sectionIdMap)
  for (const step of steps) {
    const remappedSectionId = step.section_id !== null ? (sectionIdMap.get(step.section_id) ?? null) : null;
    await db.execute(
      `INSERT INTO recipe_steps
       (recipe_id, paint_id, step_name, order_index, notes,
        painting_phase, tool, technique, dilution, time_estimate_minutes,
        step_photo_path, alt_paint_id, section_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        newRecipeId, step.paint_id, step.step_name, step.order_index,
        step.notes, step.painting_phase, step.tool, step.technique,
        step.dilution, step.time_estimate_minutes,
        step.step_photo_path ?? null, step.alt_paint_id ?? null,
        remappedSectionId,
      ]
    );
  }

  await db.execute("COMMIT", []);
  return newRecipeId;

  } catch (e) {
    await db.execute("ROLLBACK", []);
    throw e;
  }
}

/**
 * DI-03 / DI-04 — Atomic save of a complete recipe graph (metadata + sections + steps).
 *
 * Wraps the full five-phase diff in a single BEGIN/COMMIT block with flat inline SQL.
 * On any error mid-save, ROLLBACK is called and the error is re-thrown so the calling
 * component can show a toast and keep the form open with data intact.
 *
 * Handles both create (recipeId === null) and edit (recipeId !== null) paths:
 *   - Create: INSERT recipe row → INSERT all sections → INSERT all steps
 *   - Edit: UPDATE recipe row → diff-based (DELETE removed sections → UPDATE existing
 *     sections → INSERT new sections extending sectionIdMap → DELETE removed steps →
 *     UPDATE/INSERT remaining steps per section with correct order_index)
 *
 * All SQL uses $1/$2 positional parameters — no string interpolation of user input.
 * Does NOT call createRecipeSection, updateRecipeSection, addRecipePaint, etc. — each
 * of those calls getDb() independently and would run outside this transaction.
 */
export async function saveRecipeGraph(
  recipeId: number | null,
  formValues: RecipeFormValues,
  sections: DraftSection[],
  existingSections: RecipeSection[],
  existingSteps: RecipeStep[],
): Promise<number> {
  const db = await getDb();
  await db.execute("BEGIN TRANSACTION", []);
  try {
    let finalRecipeId: number;

    if (recipeId === null) {
      // -----------------------------------------------------------------------
      // CREATE PATH — INSERT recipe row
      // -----------------------------------------------------------------------
      const result = await db.execute(
        `INSERT INTO painting_recipes (
           name, faction_id, unit_id, area,
           primer, basecoat, shade, layer, highlight, glaze_filter,
           weathering, technical, basing, notes, tutorial_link,
           style, surface, effect, difficulty, estimated_minutes, result_photo_path
         ) VALUES (
           $1, $2, $3, $4,
           $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, $15,
           $16, $17, $18, $19, $20, $21
         )`,
        [
          formValues.name,
          formValues.faction_id ?? null,
          formValues.unit_id ?? null,
          formValues.area ?? null,
          null, null, null, null, null, null, // primer…glaze_filter: legacy text columns
          null, null, null,                   // weathering, technical, basing: legacy
          formValues.notes ?? null,
          formValues.tutorial_link || null,
          formValues.style ?? null,
          formValues.surface ?? null,
          formValues.effect ?? null,
          formValues.difficulty ?? null,
          formValues.estimated_minutes ?? null,
          formValues.result_photo_path ?? null,
        ],
      );
      finalRecipeId = result.lastInsertId ?? 0;

      // INSERT all sections and build sectionIdMap
      const sectionIdMap = new Map<string, number>();
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        const sectionResult = await db.execute(
          `INSERT INTO recipe_sections (recipe_id, name, surface, optional, order_index, notes, section_type, technique, execution_mode, applies_to)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            finalRecipeId,
            sec.name,
            sec.surface ?? null,
            sec.optional,
            i,
            sec.notes ?? null,
            sec.section_type ?? null,
            sec.technique ?? null,
            sec.execution_mode ?? null,
            sec.applies_to ?? null,
          ],
        );
        sectionIdMap.set(sec.localId, sectionResult.lastInsertId ?? 0);
      }

      // INSERT all steps with per-section order_index via computeOrderIndex
      for (const sec of sections) {
        const indexedSteps = computeOrderIndex(sec.steps);
        for (const s of indexedSteps) {
          await db.execute(
            `INSERT INTO recipe_steps
             (recipe_id, paint_id, step_name, order_index, notes,
              painting_phase, tool, technique, dilution, time_estimate_minutes,
              step_photo_path, alt_paint_id, section_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              finalRecipeId,
              s.paint_id ?? null,
              s.step_name,
              s.order_index,
              s.notes ?? null,
              s.painting_phase ?? null,
              s.tool ?? null,
              s.technique ?? null,
              s.dilution ?? null,
              s.time_estimate_minutes ?? null,
              s.step_photo_path ?? null,
              s.alt_paint_id ?? null,
              sectionIdMap.get(sec.localId) ?? null,
            ],
          );
        }
      }
    } else {
      // -----------------------------------------------------------------------
      // EDIT PATH — UPDATE recipe row
      // -----------------------------------------------------------------------
      await db.execute(
        `UPDATE painting_recipes
         SET name              = $2,
             faction_id        = $3,
             unit_id           = $4,
             area              = $5,
             notes             = $6,
             tutorial_link     = $7,
             style             = $8,
             surface           = $9,
             effect            = $10,
             difficulty        = $11,
             estimated_minutes = $12,
             result_photo_path = $13,
             updated_at        = datetime('now')
         WHERE id = $1`,
        [
          recipeId,
          formValues.name,
          formValues.faction_id ?? null,
          formValues.unit_id ?? null,
          formValues.area ?? null,
          formValues.notes ?? null,
          formValues.tutorial_link || null,
          formValues.style ?? null,
          formValues.surface ?? null,
          formValues.effect ?? null,
          formValues.difficulty ?? null,
          formValues.estimated_minutes ?? null,
          formValues.result_photo_path ?? null,
        ],
      );
      finalRecipeId = recipeId;

      // Phase 1 — compute section diff
      const { toDelete: sectionsToDelete, toUpdate: sectionsToUpdate, toInsert: sectionsToInsert }
        = computeSectionDiff(sections, existingSections);

      // Phase 2 — DELETE removed sections (ON DELETE CASCADE removes their steps)
      for (const id of sectionsToDelete) {
        await db.execute("DELETE FROM recipe_sections WHERE id = $1", [id]);
      }

      // Phase 3 — UPDATE existing sections with their current order_index
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        if (!sectionsToUpdate.includes(sec)) continue;
        await db.execute(
          `UPDATE recipe_sections
           SET name           = COALESCE($2, name),
               surface        = $3,
               optional       = COALESCE($4, optional),
               order_index    = COALESCE($5, order_index),
               notes          = $6,
               section_type   = $7,
               technique      = $8,
               execution_mode = $9,
               applies_to     = $10,
               updated_at     = datetime('now')
           WHERE id = $1`,
          [
            sec.dbId,
            sec.name ?? null,
            sec.surface ?? null,
            sec.optional ?? null,
            i,
            sec.notes ?? null,
            sec.section_type ?? null,
            sec.technique ?? null,
            sec.execution_mode ?? null,
            sec.applies_to ?? null,
          ],
        );
      }

      // Phase 4 — seed sectionIdMap from survivors, then INSERT new sections
      const sectionIdMap = buildSectionIdMap(sections);
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        if (!sectionsToInsert.includes(sec)) continue;
        const sectionResult = await db.execute(
          `INSERT INTO recipe_sections (recipe_id, name, surface, optional, order_index, notes, section_type, technique, execution_mode, applies_to)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            finalRecipeId,
            sec.name,
            sec.surface ?? null,
            sec.optional,
            i,
            sec.notes ?? null,
            sec.section_type ?? null,
            sec.technique ?? null,
            sec.execution_mode ?? null,
            sec.applies_to ?? null,
          ],
        );
        sectionIdMap.set(sec.localId, sectionResult.lastInsertId ?? 0);
      }

      // Phase 5 — compute step diff
      const { toDelete: stepsToDelete } = computeStepDiff(sections, existingSteps);

      // DELETE removed steps
      for (const id of stepsToDelete) {
        await db.execute("DELETE FROM recipe_steps WHERE id = $1", [id]);
      }

      // UPDATE existing steps and INSERT new steps — iterate sections for correct order_index
      for (const sec of sections) {
        const indexedSteps = computeOrderIndex(sec.steps);
        for (const s of indexedSteps) {
          const resolvedSectionId = sectionIdMap.get(sec.localId) ?? null;
          if (s.dbId !== null) {
            // UPDATE existing step
            await db.execute(
              `UPDATE recipe_steps
               SET paint_id              = $2,
                   step_name             = $3,
                   order_index           = $4,
                   notes                 = $5,
                   painting_phase        = $6,
                   tool                  = $7,
                   technique             = $8,
                   dilution              = $9,
                   time_estimate_minutes = $10,
                   step_photo_path       = $11,
                   alt_paint_id          = $12,
                   section_id            = $13
               WHERE id = $1`,
              [
                s.dbId,
                s.paint_id ?? null,
                s.step_name,
                s.order_index,
                s.notes ?? null,
                s.painting_phase ?? null,
                s.tool ?? null,
                s.technique ?? null,
                s.dilution ?? null,
                s.time_estimate_minutes ?? null,
                s.step_photo_path ?? null,
                s.alt_paint_id ?? null,
                resolvedSectionId,
              ],
            );
          } else {
            // INSERT new step
            await db.execute(
              `INSERT INTO recipe_steps
               (recipe_id, paint_id, step_name, order_index, notes,
                painting_phase, tool, technique, dilution, time_estimate_minutes,
                step_photo_path, alt_paint_id, section_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
              [
                finalRecipeId,
                s.paint_id ?? null,
                s.step_name,
                s.order_index,
                s.notes ?? null,
                s.painting_phase ?? null,
                s.tool ?? null,
                s.technique ?? null,
                s.dilution ?? null,
                s.time_estimate_minutes ?? null,
                s.step_photo_path ?? null,
                s.alt_paint_id ?? null,
                resolvedSectionId,
              ],
            );
          }
        }
      }
    }

    await db.execute("COMMIT", []);
    return finalRecipeId;
  } catch (e) {
    await db.execute("ROLLBACK", []);
    throw e;
  }
}
