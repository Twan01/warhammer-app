import { getDb } from "@/db/client";
import type { Paint, CreatePaintInput, UpdatePaintInput } from "@/types/paint";

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
    `INSERT INTO paints (brand, name, paint_type, color_family, hex_color, owned, quantity, running_low, wishlist, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      input.brand, input.name, input.paint_type,
      input.color_family ?? null, input.hex_color ?? null,
      input.owned, input.quantity ?? null,
      input.running_low, input.wishlist,
      input.notes ?? null,
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
            updated_at   = datetime('now')
      WHERE id = $1`,
    [
      input.id,
      input.brand ?? null, input.name ?? null, input.paint_type ?? null,
      input.color_family ?? null, input.hex_color ?? null,
      input.owned ?? null, input.quantity ?? null,
      input.running_low ?? null, input.wishlist ?? null,
      input.notes ?? null,
    ]
  );
}

export async function deletePaint(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM paints WHERE id = $1", [id]);
  // FK violation (paint referenced in recipe_paints) throws — caller catches
}
