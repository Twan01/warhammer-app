import { getDb } from "@/db/client";
import type { RecipeStep, CreateRecipeStepInput } from "@/types/recipePaint";

export async function getRecipePaintsByRecipe(recipeId: number): Promise<RecipeStep[]> {
  const db = await getDb();
  return db.select<RecipeStep[]>(
    "SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY order_index ASC",
    [recipeId]
  );
}

export async function addRecipePaint(input: CreateRecipeStepInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO recipe_steps
     (recipe_id, paint_id, step_name, order_index, notes,
      painting_phase, tool, technique, dilution, time_estimate_minutes,
      step_photo_path, alt_paint_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      input.recipe_id, input.paint_id, input.step_name, input.order_index, input.notes ?? null,
      input.painting_phase ?? null, input.tool ?? null, input.technique ?? null,
      input.dilution ?? null, input.time_estimate_minutes ?? null,
      input.step_photo_path ?? null, input.alt_paint_id ?? null,
    ]
  );
  return result.lastInsertId ?? 0;
}

export async function removeRecipePaint(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM recipe_steps WHERE id = $1", [id]);
}
// No updateRecipePaint — links are immutable; to change, remove + re-add.

/**
 * Returns the distinct recipe IDs that reference a given paint via recipe_steps.
 * Used by the Phase 7 Paint Inventory page (PINV-05) — when the user clicks a
 * "Used in N recipes" badge on a paint row, the Recipes page reads `paintId`
 * from the URL and calls useRecipeIdsByPaint(paintId) to narrow the visible
 * recipe list. The DISTINCT prevents duplicates when a paint appears on
 * multiple steps of the same recipe.
 *
 * Single SQL query — never iterate getRecipePaintsByRecipe per recipe (N+1).
 */
export async function getRecipeIdsByPaintId(paintId: number): Promise<number[]> {
  const db = await getDb();
  const rows = await db.select<{ recipe_id: number }[]>(
    "SELECT DISTINCT recipe_id FROM recipe_steps WHERE paint_id = $1",
    [paintId],
  );
  return rows.map((r) => r.recipe_id);
}

/**
 * WKSP-02 — batch swatch color query.
 *
 * Returns a flat array of {recipe_id, paint_id, hex_color} for ALL recipes in
 * a single JOIN query. The UI groups these by recipe_id to render swatch strips.
 *
 * Critical: single query across all recipes — NOT N+1 per recipe (Pitfall 3).
 * Ordered by recipe_id ASC, order_index ASC so the UI receives strips in a
 * deterministic order without extra sorting.
 */
export interface RecipeSwatchEntry {
  recipe_id: number;
  paint_id: number;
  hex_color: string | null;
}

export async function getRecipeSwatchColors(): Promise<RecipeSwatchEntry[]> {
  const db = await getDb();
  return db.select<RecipeSwatchEntry[]>(
    `SELECT rp.recipe_id, rp.paint_id, p.hex_color
     FROM recipe_steps rp
     JOIN paints p ON p.id = rp.paint_id
     ORDER BY rp.recipe_id ASC, rp.order_index ASC`,
    [],
  );
}

/**
 * SCHEMA-04 — batch step count query.
 *
 * Returns {recipe_id, step_count} for ALL recipes in a single GROUP BY query.
 * Replaces the N+1 pattern where RecipesPage called getRecipePaintsByRecipe
 * per recipe just to count steps.
 *
 * Single SQL query — O(1) regardless of recipe count.
 */
export interface RecipeStepCount {
  recipe_id: number;
  step_count: number;
}

export async function getStepCountsByRecipe(): Promise<RecipeStepCount[]> {
  const db = await getDb();
  return db.select<RecipeStepCount[]>(
    `SELECT recipe_id, COUNT(*) AS step_count
     FROM recipe_steps
     GROUP BY recipe_id`,
    [],
  );
}

/**
 * PAINT-01 — batch paint availability query.
 *
 * Returns {recipe_id, owned, missing, running_low} for ALL recipes in a single
 * GROUP BY JOIN query. Excludes steps where paint_id is NULL or 0 (unlinked
 * steps have no paint to check ownership against).
 *
 * Definitions:
 *   owned       = paint exists, is owned, and is NOT running low
 *   missing     = paint exists but is NOT owned
 *   running_low = paint exists, is owned, and IS running low
 *
 * Single SQL query — O(1) regardless of recipe count.
 */
export interface RecipePaintAvailability {
  recipe_id: number;
  owned: number;
  missing: number;
  running_low: number;
}

export async function getRecipePaintAvailability(): Promise<RecipePaintAvailability[]> {
  const db = await getDb();
  return db.select<RecipePaintAvailability[]>(
    `SELECT
       rs.recipe_id,
       COUNT(CASE WHEN p.owned = 1 AND p.running_low = 0 THEN 1 END) AS owned,
       COUNT(CASE WHEN p.owned != 1 THEN 1 END) AS missing,
       COUNT(CASE WHEN p.owned = 1 AND p.running_low = 1 THEN 1 END) AS running_low
     FROM recipe_steps rs
     JOIN paints p ON p.id = rs.paint_id
     WHERE rs.paint_id IS NOT NULL AND rs.paint_id != 0
     GROUP BY rs.recipe_id`,
    [],
  );
}
