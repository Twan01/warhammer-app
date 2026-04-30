/**
 * Paint entity (DATA-06, PAINT-01..02).
 * Mirrors the paints table in 001_core_schema.sql.
 */
export const PAINT_TYPES = [
  "Primer", "Base", "Layer", "Contrast", "Shade", "Technical",
  "Dry", "Air", "Metallic", "Ink", "Oil", "Enamel", "Pigment", "Other",
] as const;

export type PaintType = typeof PAINT_TYPES[number];

export interface Paint {
  id: number;
  brand: string;
  name: string;
  paint_type: PaintType;
  color_family: string | null;
  hex_color: string | null;
  owned: 0 | 1;
  quantity: number | null;
  running_low: 0 | 1;
  wishlist: 0 | 1;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CreatePaintInput = Omit<Paint, "id" | "created_at" | "updated_at">;
export type UpdatePaintInput = Partial<CreatePaintInput> & { id: number };
