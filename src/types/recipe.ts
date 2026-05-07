/**
 * PaintingRecipe entity (DATA-06).
 * Mirrors the painting_recipes table in 001_core_schema.sql.
 * v2.5 metadata fields added in migration 012 (Phase 37).
 */
export interface PaintingRecipe {
  id: number;
  name: string;
  faction_id: number | null;
  unit_id: number | null;
  area: string | null;
  primer: string | null;
  basecoat: string | null;
  shade: string | null;
  layer: string | null;
  highlight: string | null;
  glaze_filter: string | null;
  weathering: string | null;
  technical: string | null;
  basing: string | null;
  notes: string | null;
  tutorial_link: string | null;
  // v2.5 metadata (Phase 37)
  style: string | null;
  surface: string | null;
  effect: string | null;
  difficulty: string | null;
  estimated_minutes: number | null;
  result_photo_path: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateRecipeInput = Omit<PaintingRecipe, "id" | "created_at" | "updated_at">;
export type UpdateRecipeInput = Partial<CreateRecipeInput> & { id: number };
