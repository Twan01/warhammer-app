import { getDb } from "@/db/client";
import type { RecipePaint, CreateRecipePaintInput } from "@/types/recipePaint";

export async function getRecipePaintsByRecipe(recipeId: number): Promise<RecipePaint[]> {
  const db = await getDb();
  return db.select<RecipePaint[]>(
    "SELECT * FROM recipe_paints WHERE recipe_id = $1 ORDER BY order_index ASC",
    [recipeId]
  );
}

export async function addRecipePaint(input: CreateRecipePaintInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO recipe_paints (recipe_id, paint_id, step_name, order_index, notes)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.recipe_id, input.paint_id, input.step_name, input.order_index, input.notes ?? null]
  );
  return result.lastInsertId ?? 0;
}

export async function removeRecipePaint(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM recipe_paints WHERE id = $1", [id]);
}
// No updateRecipePaint — links are immutable; to change, remove + re-add.

/**
 * Returns the distinct recipe IDs that reference a given paint via recipe_paints.
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
    "SELECT DISTINCT recipe_id FROM recipe_paints WHERE paint_id = $1",
    [paintId],
  );
  return rows.map((r) => r.recipe_id);
}
