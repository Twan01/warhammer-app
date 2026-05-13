/**
 * Phase 62 — Applied recipe assignment types (AR-01).
 *
 * Mirrors the unit_recipe_assignments and unit_recipe_step_progress tables
 * created in migration 021. Used by query modules, hooks, and pure functions.
 */

/** Row from unit_recipe_assignments table. */
export interface RecipeAssignment {
  id: number;
  unit_id: number;
  recipe_id: number;
  created_at: string;
}

/** Input for creating a new assignment (id and created_at are auto-generated). */
export type CreateRecipeAssignmentInput = Omit<RecipeAssignment, "id" | "created_at">;

/** Row from unit_recipe_step_progress table. */
export interface StepProgress {
  id: number;
  assignment_id: number;
  order_index: number;
  completed: number;   // 0 | 1 SQLite boolean
  completed_at: string | null;
}

/**
 * Computed progress summary for a single assignment.
 * Returned by computeAssignmentProgress — no DB round-trip needed.
 */
export interface AssignmentProgress {
  total: number;
  completed: number;
  percentage: number;
  /** Per-section breakdown. Key is section_id (null for flat/unsectioned recipes). */
  bySectionId: Map<number | null, { total: number; completed: number }>;
}
