/**
 * Technique entity types (v0.7.0 — Phase 142, migration 051).
 * Mirrors the technique_* tables in 051_technique_library_foundation.sql.
 *
 * Column sets are VERIFIED against migration 051:
 * - technique_colour_slots: NO updated_at
 * - technique_steps: NO updated_at, NO step_photo_path, NO alt_paint_id
 * - technique_sections: HAS updated_at
 * - techniques: HAS updated_at
 */

// ---------------------------------------------------------------------------
// DB-row types — mirror migration 051 exactly
// ---------------------------------------------------------------------------

export interface Technique {
  id: number;
  name: string;
  effect: string | null;
  difficulty: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** NOTE: No updated_at column — migration 051 omitted it on this table. */
export interface TechniqueColourSlot {
  id: number;
  technique_id: number;
  name: string;
  role_hint: string | null;
  order_index: number;
  created_at: string;
}

export interface TechniqueSection {
  id: number;
  technique_id: number;
  name: string;
  surface: string | null;
  optional: number;
  order_index: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * NOTE: No updated_at, no step_photo_path, no alt_paint_id — migration 051.
 * Joins to technique via technique_sections (no direct technique_id column).
 */
export interface TechniqueStep {
  id: number;
  technique_section_id: number;
  colour_slot_id: number | null;
  step_name: string;
  order_index: number;
  notes: string | null;
  painting_phase: string | null;
  tool: string | null;
  technique: string | null;
  dilution: string | null;
  time_estimate_minutes: number | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Input types for CRUD operations
// ---------------------------------------------------------------------------

export type CreateTechniqueInput = Omit<Technique, "id" | "created_at" | "updated_at">;
export type UpdateTechniqueInput = Partial<CreateTechniqueInput> & { id: number };

// ---------------------------------------------------------------------------
// Draft types — form-level representations used by the technique save flow
// ---------------------------------------------------------------------------

/**
 * DraftTechniqueSlot: top-level slot on the technique (not per-step).
 * localId is a UUID used as React key + DnD id + slotIdMap key.
 * dbId is null for new slots not yet persisted to the DB.
 */
export interface DraftTechniqueSlot {
  localId: string;
  dbId: number | null;
  name: string;
  role_hint: string | null;
  order_index: number;
}

/**
 * DraftTechniqueStep: step row inside a technique section.
 * colour_slot_id references DraftTechniqueSlot.localId in form state;
 * it is resolved to an integer DB PK via slotIdMap at save time.
 *
 * NO paint_id, NO alt_paint_id, NO step_photo_path — technique_steps has none of these.
 */
export interface DraftTechniqueStep {
  localId: string;
  dbId: number | null;
  step_name: string;
  /** References DraftTechniqueSlot.localId in form state; null = no slot. */
  colour_slot_id: string | null;
  notes: string | null;
  painting_phase: string | null;
  tool: string | null;
  technique: string | null;
  dilution: string | null;
  time_estimate_minutes: number | null;
}

/**
 * DraftTechniqueSection: section row inside a technique.
 * NO section_type, NO technique, NO execution_mode, NO applies_to —
 * technique_sections has none of these (only recipe_sections does).
 */
export interface DraftTechniqueSection {
  localId: string;
  dbId: number | null;
  name: string;
  surface: string | null;
  /** 0 = required, 1 = skippable */
  optional: number;
  notes: string | null;
  steps: DraftTechniqueStep[];
}

/**
 * TechniqueFormValues: interface matching the Zod schema shape.
 * Defined here (not re-exported from the feature schema) so the query layer
 * can reference it without a transitive feature dependency — same rationale
 * as RecipeFormValues in src/types/recipe.ts.
 */
export interface TechniqueFormValues {
  name: string;
  description: string | null;
  effect: string | null;
  difficulty: string | null;
  estimated_minutes: number | null;
  result_photo_path: string | null;
  notes: string | null;
}

/**
 * TechniqueWithCounts: batch query result for card grid display.
 * Returns technique metadata + slot/step/usage counts in a single JOIN query
 * to avoid N+1 (step_count derived via JOIN through technique_sections, not
 * a direct GROUP BY on technique_steps — which has no technique_id column).
 */
export interface TechniqueWithCounts {
  id: number;
  name: string;
  effect: string | null;
  difficulty: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  slot_count: number;
  step_count: number;
  usage_count: number;
}

/**
 * TechniqueUsageCount: per-technique usage count from recipe_technique_instances.
 */
export interface TechniqueUsageCount {
  technique_id: number;
  usage_count: number;
}
