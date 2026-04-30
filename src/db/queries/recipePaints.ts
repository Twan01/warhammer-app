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
