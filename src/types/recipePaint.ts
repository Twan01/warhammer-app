/**
 * RecipePaint join entity (DATA-06).
 * Mirrors the recipe_paints table in 001_core_schema.sql.
 */
export interface RecipePaint {
  id: number;
  recipe_id: number;
  paint_id: number;
  step_name: string;
  order_index: number;
  notes: string | null;
  created_at: string;
}

export type CreateRecipePaintInput = Omit<RecipePaint, "id" | "created_at">;
