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
    `INSERT INTO recipe_steps (recipe_id, paint_id, step_name, order_index, notes)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.recipe_id, input.paint_id, input.step_name, input.order_index, input.notes ?? null]
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
