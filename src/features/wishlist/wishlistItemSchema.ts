import { z } from "zod";

/**
 * Zod schema for wishlist item create/edit form.
 * NO .default() — breaks react-hook-form zodResolver with zod v4.
 * Use buildDefaultValues() in the Sheet component instead.
 */
export const wishlistItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  faction_id: z.number().int().positive("Faction is required"),
  estimated_cost_pence: z.number().int().min(0).nullable(),
  notes: z.string().max(2000).nullable(),
});

export type WishlistItemFormValues = z.infer<typeof wishlistItemSchema>;
