import { getDb } from "@/db/client";
import type { RecipeSection, CreateRecipeSectionInput, UpdateRecipeSectionInput } from "@/types/recipeSection";

export interface SectionStepCount {
  section_id: number;
  step_count: number;
}

/**
 * Returns all sections for a recipe, ordered by order_index then id as a tiebreaker.
 */
export async function getRecipeSections(recipeId: number): Promise<RecipeSection[]> {
  const db = await getDb();
  return db.select<RecipeSection[]>(
    "SELECT * FROM recipe_sections WHERE recipe_id = $1 ORDER BY order_index ASC, id ASC",
    [recipeId],
  );
}

/**
 * Inserts a new section for a recipe. Returns the new section's id.
 */
export async function createRecipeSection(input: CreateRecipeSectionInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO recipe_sections (recipe_id, name, surface, optional, order_index, notes, section_type, technique, execution_mode, applies_to)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      input.recipe_id,
      input.name,
      input.surface ?? null,
      input.optional,
      input.order_index,
      input.notes ?? null,
      input.section_type ?? null,
      input.technique ?? null,
      input.execution_mode ?? null,
      input.applies_to ?? null,
    ],
  );
  return result.lastInsertId ?? 0;
}

/**
 * Updates mutable fields on a section.
 *
 * surface and notes use direct assignment because null is a valid value (user may want to clear them).
 * name, optional, and order_index use COALESCE so omitting them (passing null) means "don't change".
 */
export async function updateRecipeSection(input: UpdateRecipeSectionInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE recipe_sections
     SET name = COALESCE($2, name),
         surface = $3,
         optional = COALESCE($4, optional),
         order_index = COALESCE($5, order_index),
         notes = $6,
         section_type = $7,
         technique = $8,
         execution_mode = $9,
         applies_to = $10,
         updated_at = datetime('now')
     WHERE id = $1`,
    [
      input.id,
      input.name ?? null,
      input.surface ?? null,
      input.optional ?? null,
      input.order_index ?? null,
      input.notes ?? null,
      input.section_type ?? null,
      input.technique ?? null,
      input.execution_mode ?? null,
      input.applies_to ?? null,
    ],
  );
}

/**
 * Deletes a section by id.
 * ON DELETE CASCADE handles recipe_steps cleanup; session links are SET NULL (migration 014).
 */
export async function deleteRecipeSection(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM recipe_sections WHERE id = $1", [id]);
}

/**
 * Persists a new section order via sequential UPDATE.
 * No UNIQUE constraint on order_index, so sequential updates are safe.
 */
export async function reorderRecipeSections(
  sections: { id: number; order_index: number }[],
): Promise<void> {
  const db = await getDb();
  await db.execute("BEGIN TRANSACTION", []);
  try {
    for (const { id, order_index } of sections) {
      await db.execute(
        "UPDATE recipe_sections SET order_index = $1, updated_at = datetime('now') WHERE id = $2",
        [order_index, id],
      );
    }
    await db.execute("COMMIT", []);
  } catch (e) {
    await db.execute("ROLLBACK", []);
    throw e;
  }
}

/**
 * Returns step counts per section in a single GROUP BY query.
 * The WHERE section_id IS NOT NULL guard excludes any orphaned steps.
 */
export async function getStepCountsBySection(): Promise<SectionStepCount[]> {
  const db = await getDb();
  return db.select<SectionStepCount[]>(
    `SELECT section_id, COUNT(*) AS step_count
     FROM recipe_steps
     WHERE section_id IS NOT NULL
     GROUP BY section_id`,
    [],
  );
}

/**
 * INTG-02 — batch section count per recipe.
 * Returns {recipe_id, section_count}[] via GROUP BY.
 * Single SQL query for RecipeCard grid display.
 */
export interface RecipeSectionCount {
  recipe_id: number;
  section_count: number;
}

export async function getSectionCountsByRecipe(): Promise<RecipeSectionCount[]> {
  const db = await getDb();
  return db.select<RecipeSectionCount[]>(
    `SELECT recipe_id, COUNT(*) AS section_count
     FROM recipe_sections
     GROUP BY recipe_id`,
    [],
  );
}
