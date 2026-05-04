import { getDb } from "@/db/client";
import type { Paint, CreatePaintInput, UpdatePaintInput, PaintWithRecipeCount } from "@/types/paint";

export async function getPaints(): Promise<Paint[]> {
  const db = await getDb();
  return db.select<Paint[]>("SELECT * FROM paints ORDER BY brand ASC, name ASC");
}

export async function getPaintById(id: number): Promise<Paint | null> {
  const db = await getDb();
  const rows = await db.select<Paint[]>("SELECT * FROM paints WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createPaint(input: CreatePaintInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO paints (brand, name, paint_type, color_family, hex_color, owned, quantity, running_low, wishlist, notes, purchase_price_pence)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      input.brand, input.name, input.paint_type,
      input.color_family ?? null, input.hex_color ?? null,
      input.owned, input.quantity ?? null,
      input.running_low, input.wishlist,
      input.notes ?? null,
      input.purchase_price_pence ?? null,
    ]
  );
  return result.lastInsertId ?? 0;
}

export async function updatePaint(input: UpdatePaintInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE paints
        SET brand        = COALESCE($2, brand),
            name         = COALESCE($3, name),
            paint_type   = COALESCE($4, paint_type),
            color_family = COALESCE($5, color_family),
            hex_color    = COALESCE($6, hex_color),
            owned        = COALESCE($7, owned),
            quantity     = COALESCE($8, quantity),
            running_low  = COALESCE($9, running_low),
            wishlist     = COALESCE($10, wishlist),
            notes        = COALESCE($11, notes),
            purchase_price_pence = $12,
            updated_at   = datetime('now')
      WHERE id = $1`,
    [
      input.id,
      input.brand ?? null, input.name ?? null, input.paint_type ?? null,
      input.color_family ?? null, input.hex_color ?? null,
      input.owned ?? null, input.quantity ?? null,
      input.running_low ?? null, input.wishlist ?? null,
      input.notes ?? null,
      input.purchase_price_pence ?? null,
    ]
  );
}

export async function deletePaint(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM paints WHERE id = $1", [id]);
  // FK violation (paint referenced in recipe_paints) throws — caller catches
}

/**
 * Returns all paints with a recipe_count column from a LEFT JOIN on recipe_paints.
 * Used by the Phase 7 Paint Inventory page (PINV-05) to render "used in N recipes"
 * badges. The COUNT happens in SQL — never re-query recipe_paints from JS to count
 * usages per paint (that's an N+1 anti-pattern).
 *
 * The corresponding query key is PAINTS_WITH_RECIPES_KEY in src/hooks/usePaints.ts.
 * useCreatePaint, useUpdatePaint, useDeletePaint must invalidate this key in
 * addition to PAINTS_KEY (added in plan 06-04).
 */
export async function getPaintsWithRecipeCount(): Promise<PaintWithRecipeCount[]> {
  const db = await getDb();
  return db.select<PaintWithRecipeCount[]>(`
    SELECT p.*, COUNT(rp.id) AS recipe_count
    FROM paints p
    LEFT JOIN recipe_paints rp ON rp.paint_id = p.id
    GROUP BY p.id
    ORDER BY p.brand ASC, p.name ASC
  `);
}
