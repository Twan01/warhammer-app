import { getDb } from "@/db/client";
import type {
  WishlistItem,
  CreateWishlistItemInput,
  UpdateWishlistItemInput,
} from "@/types/wishlistItem";

export async function getWishlistItems(): Promise<WishlistItem[]> {
  const db = await getDb();
  return db.select<WishlistItem[]>(
    "SELECT * FROM wishlist_items ORDER BY created_at DESC"
  );
}

export async function createWishlistItem(
  input: CreateWishlistItemInput
): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO wishlist_items (name, faction_id, estimated_cost_pence, notes)
     VALUES ($1, $2, $3, $4)`,
    [input.name, input.faction_id, input.estimated_cost_pence ?? null, input.notes ?? null]
  );
  return result.lastInsertId ?? 0;
}

export async function updateWishlistItem(
  input: UpdateWishlistItemInput
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE wishlist_items
     SET name = $1, faction_id = $2, estimated_cost_pence = $3, notes = $4
     WHERE id = $5`,
    [input.name, input.faction_id, input.estimated_cost_pence ?? null, input.notes ?? null, input.id]
  );
}

export async function deleteWishlistItem(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM wishlist_items WHERE id = $1", [id]);
}
