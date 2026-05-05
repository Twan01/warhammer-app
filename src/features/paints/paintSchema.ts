import { z } from "zod";
import { PAINT_TYPES } from "@/types/paint";

/**
 * Zod schema for the paint form (PAINT-01).
 * Booleans (owned, running_low, wishlist) are stored as 0|1 in DB (Pitfall 1).
 * Schema accepts boolean from the form; submit handler coerces ? 1 : 0.
 *
 * NOTE: .default() is deliberately NOT used here (see decision 02-03: zod v4 .default()
 * makes input type optional, causing Resolver type mismatch with react-hook-form). Form
 * defaultValues handle defaults instead.
 */
export const paintSchema = z.object({
  brand: z.string().min(1, "Brand is required").max(60, "Brand must be 60 characters or fewer"),
  name: z.string().min(1, "Name is required").max(80, "Name must be 80 characters or fewer"),
  paint_type: z.enum(PAINT_TYPES),
  color_family: z.string().max(40).optional().nullable(),
  hex_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a 6-digit hex like #4A90D9")
    .optional()
    .nullable()
    .or(z.literal("")),
  owned: z.boolean(),
  quantity: z.number().int().min(0).optional().nullable(),
  running_low: z.boolean(),
  wishlist: z.boolean(),
  notes: z.string().max(500).optional().nullable(),
  purchase_price_pence: z.number().int().min(0).optional().nullable(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional().nullable().or(z.literal("")),
});

export type PaintFormValues = z.infer<typeof paintSchema>;
