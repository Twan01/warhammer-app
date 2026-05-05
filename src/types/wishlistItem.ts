export interface WishlistItem {
  id: number;
  name: string;
  faction_id: number;
  estimated_cost_pence: number | null;
  notes: string | null;
  created_at: string;
}

export type CreateWishlistItemInput = Omit<WishlistItem, "id" | "created_at">;
export type UpdateWishlistItemInput = CreateWishlistItemInput & { id: number };
