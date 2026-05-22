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

// ---------------------------------------------------------------------------
// Draft types — form-level representations used by recipe save flow
// ---------------------------------------------------------------------------

export interface DraftStep {
  localId: string;
  dbId: number | null;
  step_name: string;
  paint_id: number | null;
  notes: string | null;
  painting_phase: string | null;
  tool: string | null;
  technique: string | null;
  dilution: string | null;
  time_estimate_minutes: number | null;
  step_photo_path: string | null;
  alt_paint_id: number | null;
}

export interface DraftSection {
  /** UUID assigned at draft creation; never stored in DB */
  localId: string;
  dbId: number | null;
  name: string;
  surface: string | null;
  /** 0 = required, 1 = skippable */
  optional: number;
  notes: string | null;
  // Phase 57 — workflow metadata (WF-01..04)
  section_type: string | null;
  technique: string | null;
  execution_mode: string | null;
  applies_to: string | null;
  steps: DraftStep[];
}

/**
 * Standalone RecipeFormValues interface matching the Zod schema shape.
 * Defined here (not re-exported from the feature schema) so the query layer
 * can reference it without a transitive feature dependency.
 */
export interface RecipeFormValues {
  name: string;
  faction_id: number | null;
  unit_id: number | null;
  area: string | null;
  notes: string | null;
  tutorial_link: string | null;
  style: string | null;
  surface: string | null;
  effect: string | null;
  difficulty: string | null;
  estimated_minutes: number | null;
  result_photo_path: string | null;
}
