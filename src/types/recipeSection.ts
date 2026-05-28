/**
 * Workflow metadata const arrays — single source of truth for dropdown values.
 * Phase 57 (WF-01, WF-02, WF-03).
 */
export const SECTION_TYPES = [
  "prep", "basecoat", "shade", "layer", "detail", "effect", "finishing",
  "assembly", "basing", "varnish",
] as const;
export type SectionType = typeof SECTION_TYPES[number];

export const TECHNIQUES = [
  "brush", "sponge", "drybrush", "airbrush", "oil-enamel", "pigment", "decal", "mixed", "other",
] as const;
export type Technique = typeof TECHNIQUES[number];

export const EXECUTION_MODES = [
  "sequential", "batch", "parallel",
] as const;
export type ExecutionMode = typeof EXECUTION_MODES[number];

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
  // Phase 57 — workflow metadata (WF-01..04)
  section_type: string | null;
  technique: string | null;
  execution_mode: string | null;
  applies_to: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateRecipeSectionInput = Omit<RecipeSection, "id" | "created_at" | "updated_at">;
export type UpdateRecipeSectionInput = Partial<Omit<CreateRecipeSectionInput, "recipe_id">> & { id: number };
