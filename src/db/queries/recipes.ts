import { getDb } from "@/db/client";
import type { PaintingRecipe, CreateRecipeInput, UpdateRecipeInput } from "@/types/recipe";
import type { RecipeStep } from "@/types/recipePaint";
import type { RecipeSection } from "@/types/recipeSection";

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
            faction_id        = COALESCE($3, faction_id),
            unit_id           = COALESCE($4, unit_id),
            area              = COALESCE($5, area),
            primer            = COALESCE($6, primer),
            basecoat          = COALESCE($7, basecoat),
            shade             = COALESCE($8, shade),
            layer             = COALESCE($9, layer),
            highlight         = COALESCE($10, highlight),
            glaze_filter      = COALESCE($11, glaze_filter),
            weathering        = COALESCE($12, weathering),
            technical         = COALESCE($13, technical),
            basing            = COALESCE($14, basing),
            notes             = COALESCE($15, notes),
            tutorial_link     = COALESCE($16, tutorial_link),
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

  return newRecipeId;
}
