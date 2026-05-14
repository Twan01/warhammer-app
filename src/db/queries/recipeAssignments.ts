import { getDb } from "@/db/client";
import type {
  RecipeAssignment,
  CreateRecipeAssignmentInput,
  StepProgress,
} from "@/types/recipeAssignment";

/**
 * Returns all recipe assignments for a given unit, ordered by creation date.
 */
export async function getAssignmentsByUnit(unitId: number): Promise<RecipeAssignment[]> {
  const db = await getDb();
  return db.select<RecipeAssignment[]>(
    "SELECT * FROM unit_recipe_assignments WHERE unit_id = $1 ORDER BY created_at ASC",
    [unitId],
  );
}

/**
 * Returns all recipe assignments for a given recipe, ordered by creation date.
 */
export async function getAssignmentsByRecipe(recipeId: number): Promise<RecipeAssignment[]> {
  const db = await getDb();
  return db.select<RecipeAssignment[]>(
    "SELECT * FROM unit_recipe_assignments WHERE recipe_id = $1 ORDER BY created_at ASC",
    [recipeId],
  );
}

/**
 * Returns a single assignment by id, or null if not found.
 */
export async function getAssignment(id: number): Promise<RecipeAssignment | null> {
  const db = await getDb();
  const rows = await db.select<RecipeAssignment[]>(
    "SELECT * FROM unit_recipe_assignments WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Creates a new recipe assignment. Returns the new row's id.
 *
 * The (unit_id, recipe_id) pair has a UNIQUE constraint — attempting to
 * insert a duplicate will throw. Use bulkCreateAssignments with INSERT OR
 * IGNORE if duplicates should be silently skipped.
 */
export async function createAssignment(input: CreateRecipeAssignmentInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    "INSERT INTO unit_recipe_assignments (unit_id, recipe_id) VALUES ($1, $2)",
    [input.unit_id, input.recipe_id],
  );
  return result.lastInsertId ?? 0;
}

/**
 * Deletes a recipe assignment by id.
 * ON DELETE CASCADE handles unit_recipe_step_progress cleanup.
 */
export async function deleteAssignment(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM unit_recipe_assignments WHERE id = $1", [id]);
}

/**
 * Returns all step progress records for an assignment, ordered by recipe_step_id.
 */
export async function getStepProgress(assignmentId: number): Promise<StepProgress[]> {
  const db = await getDb();
  return db.select<StepProgress[]>(
    "SELECT * FROM unit_recipe_step_progress WHERE assignment_id = $1 ORDER BY recipe_step_id ASC",
    [assignmentId],
  );
}

/**
 * Upserts a step progress record. Uses ON CONFLICT DO UPDATE SET to preserve
 * the existing row id (NOT INSERT OR REPLACE which deletes + re-inserts).
 */
export async function upsertStepProgress(
  assignmentId: number,
  recipeStepId: number,
  completed: boolean,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO unit_recipe_step_progress (assignment_id, recipe_step_id, completed, completed_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(assignment_id, recipe_step_id) DO UPDATE SET
       completed = excluded.completed,
       completed_at = excluded.completed_at`,
    [
      assignmentId,
      recipeStepId,
      completed ? 1 : 0,
      completed ? new Date().toISOString() : null,
    ],
  );
}

/**
 * Assigns a recipe to multiple units in one pass. Uses INSERT OR IGNORE to
 * silently skip any (unit_id, recipe_id) pairs that already exist.
 */
export async function bulkCreateAssignments(
  unitIds: number[],
  recipeId: number,
): Promise<void> {
  const db = await getDb();
  await db.execute("BEGIN TRANSACTION", []);
  try {
    for (const unitId of unitIds) {
      await db.execute(
        "INSERT OR IGNORE INTO unit_recipe_assignments (unit_id, recipe_id) VALUES ($1, $2)",
        [unitId, recipeId],
      );
    }
    await db.execute("COMMIT", []);
  } catch (e) {
    await db.execute("ROLLBACK", []);
    throw e;
  }
}
