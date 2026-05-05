import { getDb } from "@/db/client";
import type { PaintingRecipe, CreateRecipeInput, UpdateRecipeInput } from "@/types/recipe";

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
       weathering, technical, basing, notes, tutorial_link
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7, $8, $9, $10,
       $11, $12, $13, $14, $15
     )`,
    [
      input.name, input.faction_id ?? null, input.unit_id ?? null, input.area ?? null,
      input.primer ?? null, input.basecoat ?? null, input.shade ?? null, input.layer ?? null,
      input.highlight ?? null, input.glaze_filter ?? null,
      input.weathering ?? null, input.technical ?? null, input.basing ?? null,
      input.notes ?? null, input.tutorial_link ?? null,
    ]
  );
  return result.lastInsertId ?? 0;
}

export async function updateRecipe(input: UpdateRecipeInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE painting_recipes
        SET name         = COALESCE($2, name),
            faction_id   = COALESCE($3, faction_id),
            unit_id      = COALESCE($4, unit_id),
            area         = COALESCE($5, area),
            primer       = COALESCE($6, primer),
            basecoat     = COALESCE($7, basecoat),
            shade        = COALESCE($8, shade),
            layer        = COALESCE($9, layer),
            highlight    = COALESCE($10, highlight),
            glaze_filter = COALESCE($11, glaze_filter),
            weathering   = COALESCE($12, weathering),
            technical    = COALESCE($13, technical),
            basing       = COALESCE($14, basing),
            notes        = COALESCE($15, notes),
            tutorial_link = COALESCE($16, tutorial_link),
            updated_at   = datetime('now')
      WHERE id = $1`,
    [
      input.id,
      input.name ?? null, input.faction_id ?? null, input.unit_id ?? null, input.area ?? null,
      input.primer ?? null, input.basecoat ?? null, input.shade ?? null, input.layer ?? null,
      input.highlight ?? null, input.glaze_filter ?? null,
      input.weathering ?? null, input.technical ?? null, input.basing ?? null,
      input.notes ?? null, input.tutorial_link ?? null,
    ]
  );
}

export async function deleteRecipe(id: number): Promise<void> {
  const db = await getDb();
  // recipe_paints.recipe_id uses CASCADE — linked paints removed automatically
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
): Promise<{ unit_id: number; name: string }[]> {
  if (unitIds.length === 0) return [];
  const db = await getDb();
  const placeholders = unitIds.map((_, i) => `$${i + 1}`).join(", ");
  return db.select(
    `SELECT unit_id, name FROM painting_recipes WHERE unit_id IN (${placeholders})`,
    unitIds
  );
}
