/**
 * RecipeStep entity (v2.5 SCHEMA-01).
 * Mirrors the recipe_steps table (renamed from recipe_paints in migration 012).
 */
export interface RecipeStep {
  id: number;
  recipe_id: number;
  paint_id: number;
  step_name: string;
  order_index: number;
  notes: string | null;
  // v2.5 structured step fields (Phase 37)
  painting_phase: string | null;
  tool: string | null;
  technique: string | null;
  dilution: string | null;
  time_estimate_minutes: number | null;
  // v2.5 Phase 40 fields
  step_photo_path: string | null;
  alt_paint_id: number | null;
  created_at: string;
}

/** @deprecated Use RecipeStep instead */
export type RecipePaint = RecipeStep;

export type CreateRecipeStepInput = Omit<RecipeStep, "id" | "created_at">;
/** @deprecated Use CreateRecipeStepInput instead */
export type CreateRecipePaintInput = CreateRecipeStepInput;
