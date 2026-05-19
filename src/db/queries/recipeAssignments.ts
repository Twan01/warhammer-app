import { getDb } from "@/db/client";
import type {
  RecipeAssignment,
  CreateRecipeAssignmentInput,
  StepProgress,
} from "@/types/recipeAssignment";
import type { CreateSessionInput } from "@/types/paintingSession";

export interface FirstIncompleteStep {
  assignment_id: number;
  unit_id: number;
  unit_name: string;
  recipe_id: number;
  recipe_name: string;
  recipe_step_id: number;
  description: string;
  section_name: string | null;
  section_id: number | null;
  order_index: number;
  time_estimate_minutes: number | null;
  created_at: string;
}

export async function getMostRecentAssignmentWithIncompleteStep(): Promise<FirstIncompleteStep | null> {
  const db = await getDb();
  const rows = await db.select<FirstIncompleteStep[]>(
    `SELECT
       a.id AS assignment_id,
       a.unit_id,
       u.name AS unit_name,
       a.recipe_id,
       r.name AS recipe_name,
       rs.id AS recipe_step_id,
       rs.step_name AS description,
       sec.name AS section_name,
       rs.section_id,
       rs.order_index,
       rs.time_estimate_minutes,
       a.created_at
     FROM unit_recipe_assignments a
     JOIN units u ON u.id = a.unit_id
     JOIN painting_recipes r ON r.id = a.recipe_id
     JOIN recipe_steps rs ON rs.recipe_id = a.recipe_id
     LEFT JOIN recipe_sections sec ON sec.id = rs.section_id
     LEFT JOIN unit_recipe_step_progress p
       ON p.assignment_id = a.id AND p.recipe_step_id = rs.id
     WHERE p.id IS NULL
     ORDER BY a.created_at DESC, rs.order_index ASC
     LIMIT 1`,
    [],
  );
  return rows[0] ?? null;
}

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

/**
 * Atomically marks a recipe step as completed AND logs a painting session.
 * Both writes happen in a single transaction — if either fails, both are
 * rolled back so we never get orphaned progress or session records.
 */
export async function completeStepWithSession(
  assignmentId: number,
  recipeStepId: number,
  session: CreateSessionInput,
): Promise<void> {
  const db = await getDb();
  await db.execute("BEGIN TRANSACTION", []);
  try {
    await db.execute(
      `INSERT INTO unit_recipe_step_progress (assignment_id, recipe_step_id, completed, completed_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT(assignment_id, recipe_step_id) DO UPDATE SET
         completed = excluded.completed,
         completed_at = excluded.completed_at`,
      [assignmentId, recipeStepId, 1, new Date().toISOString()],
    );
    await db.execute(
      `INSERT INTO painting_sessions (unit_id, session_date, duration_minutes, notes, recipe_id, recipe_step_id, section_name, recipe_section_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        session.unit_id,
        session.session_date,
        session.duration_minutes,
        session.notes ?? null,
        session.recipe_id ?? null,
        recipeStepId,
        session.section_name ?? null,
        session.recipe_section_id ?? null,
      ],
    );
    await db.execute("COMMIT", []);
  } catch (e) {
    await db.execute("ROLLBACK", []);
    throw e;
  }
}
