/**
 * RecipeSection entity (v0.2.7 SECT-01).
 * Mirrors the recipe_sections table created in migration 018.
 * A section groups recipe steps into logical workflow blocks
 * (e.g., Armour, Cloth, Weapons, Basing).
 */
export interface RecipeSection {
  id: number;
  recipe_id: number;
  name: string;
  surface: string | null;
  optional: number;          // 0 | 1 SQLite boolean — 0 = required, 1 = skippable
  order_index: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateRecipeSectionInput = Omit<RecipeSection, "id" | "created_at" | "updated_at">;
export type UpdateRecipeSectionInput = Partial<Omit<CreateRecipeSectionInput, "recipe_id">> & { id: number };
