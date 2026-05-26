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
  await syncPaintingPercentageByUnitId(db, input.unit_id);
  return result.lastInsertId ?? 0;
}

/**
 * Deletes a recipe assignment by id.
 * ON DELETE CASCADE handles unit_recipe_step_progress cleanup.
 */
export async function deleteAssignment(id: number): Promise<void> {
  const db = await getDb();
  const rows = await db.select<{ unit_id: number }[]>(
    "SELECT unit_id FROM unit_recipe_assignments WHERE id = $1",
    [id],
  );
  await db.execute("DELETE FROM unit_recipe_assignments WHERE id = $1", [id]);
  const unitId = rows[0]?.unit_id;
  if (unitId) await syncPaintingPercentageByUnitId(db, unitId);
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
 * After upserting, syncs the unit's painting_percentage from all assignments.
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
  await syncPaintingPercentageFromAssignment(db, assignmentId);
}

/**
 * Assigns a recipe to multiple units in one pass. Uses INSERT OR IGNORE to
 * silently skip any (unit_id, recipe_id) pairs that already exist.
 *
 * NOTE: Uses auto-commit per statement (no explicit transaction) because
 * tauri-plugin-sql uses sqlx::Pool<Sqlite> — each db.execute() may run on
 * a different connection from the pool.
 */
export async function bulkCreateAssignments(
  unitIds: number[],
  recipeId: number,
): Promise<void> {
  const db = await getDb();
  for (const unitId of unitIds) {
    await db.execute(
      "INSERT OR IGNORE INTO unit_recipe_assignments (unit_id, recipe_id) VALUES ($1, $2)",
      [unitId, recipeId],
    );
    await syncPaintingPercentageByUnitId(db, unitId);
  }
}

// ─── Auto-sync painting percentage from recipe step progress ─────────────────

const SYNC_PAINTING_PERCENTAGE_SQL = `
  UPDATE units SET painting_percentage = COALESCE((
    SELECT CASE WHEN COUNT(rs.id) = 0 THEN 0
      ELSE CAST(ROUND(100.0 * COUNT(CASE WHEN sp.completed = 1 THEN 1 END) / COUNT(rs.id)) AS INTEGER)
    END
    FROM unit_recipe_assignments a
    JOIN recipe_steps rs ON rs.recipe_id = a.recipe_id
    LEFT JOIN unit_recipe_step_progress sp ON sp.assignment_id = a.id AND sp.recipe_step_id = rs.id
    WHERE a.unit_id = $1
  ), 0), updated_at = datetime('now')
  WHERE id = $1`;

type DbHandle = { execute(sql: string, params: unknown[]): Promise<unknown> };

async function syncPaintingPercentageByUnitId(db: DbHandle, unitId: number): Promise<void> {
  await db.execute(SYNC_PAINTING_PERCENTAGE_SQL, [unitId]);
}

async function syncPaintingPercentageFromAssignment(db: DbHandle, assignmentId: number): Promise<void> {
  const dbFull = db as Awaited<ReturnType<typeof getDb>>;
  const rows = await dbFull.select<{ unit_id: number }[]>(
    "SELECT unit_id FROM unit_recipe_assignments WHERE id = $1",
    [assignmentId],
  );
  const unitId = rows?.[0]?.unit_id;
  if (unitId) await syncPaintingPercentageByUnitId(db, unitId);
}

// ─── PERF-03: Batched Kanban enrichment query ────────────────────────────────

/**
 * Row shape returned by getKanbanProgressByUnitIds.
 * One row per unit (the most-recent assignment), with step completion counts.
 */
export interface KanbanProgressRow {
  unit_id: number;
  assignment_id: number;
  assignment_count: number;
  recipe_id: number;
  recipe_name: string;
  total_steps: number;
  completed_steps: number;
}

/**
 * PERF-03 — batch-fetches kanban progress for a set of unit IDs in a single
 * DB round-trip.
 *
 * Uses a CTE with ROW_NUMBER() OVER (PARTITION BY unit_id ORDER BY created_at DESC)
 * to select the most-recent assignment per unit plus COUNT(*) OVER for total
 * assignment count, then JOINs painting_recipes and LEFT JOINs recipe_steps /
 * unit_recipe_step_progress to aggregate step completion.
 *
 * Units with no assignments are naturally absent from the result — the CTE only
 * includes units that have assignments.
 *
 * IN-clause uses positional $N placeholders per Tauri plugin-sql requirement.
 * Guard clause prevents an invalid IN () SQL error when unitIds is empty.
 *
 * Threat T-98-03: injection risk is eliminated — all unitIds values go through
 * parameterized binding via Tauri plugin-sql, never string-interpolated.
 */
export async function getKanbanProgressByUnitIds(
  unitIds: number[],
): Promise<KanbanProgressRow[]> {
  if (unitIds.length === 0) return [];
  const db = await getDb();
  const placeholders = unitIds.map((_, i) => `$${i + 1}`).join(", ");
  // CTE selects most-recent assignment per unit (rn = 1), plus total assignment count.
  return db.select<KanbanProgressRow[]>(
    `WITH ranked AS (
       SELECT
         id, unit_id, recipe_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY unit_id ORDER BY created_at DESC) AS rn,
         COUNT(*) OVER (PARTITION BY unit_id) AS total_assignments
       FROM unit_recipe_assignments
       WHERE unit_id IN (${placeholders})
     )
     SELECT
       r.unit_id,
       r.id AS assignment_id,
       r.total_assignments AS assignment_count,
       r.recipe_id,
       pr.name AS recipe_name,
       COUNT(rs.id) AS total_steps,
       COUNT(CASE WHEN sp.completed = 1 THEN 1 END) AS completed_steps
     FROM ranked r
     JOIN painting_recipes pr ON pr.id = r.recipe_id
     LEFT JOIN recipe_steps rs ON rs.recipe_id = r.recipe_id
     LEFT JOIN unit_recipe_step_progress sp ON sp.assignment_id = r.id AND sp.recipe_step_id = rs.id
     WHERE r.rn = 1
     GROUP BY r.unit_id, r.id, r.recipe_id, pr.name, r.total_assignments`,
    unitIds,
  );
}

/**
 * Marks a recipe step as completed AND logs a painting session.
 * Both writes run as separate auto-committed statements.
 *
 * NOTE: Uses auto-commit per statement (no explicit transaction) because
 * tauri-plugin-sql uses sqlx::Pool<Sqlite> — each db.execute() may run on
 * a different connection from the pool. In WAL mode, the first write is
 * immediately visible to the second.
 */
export async function completeStepWithSession(
  assignmentId: number,
  recipeStepId: number,
  session: CreateSessionInput,
): Promise<void> {
  const db = await getDb();
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
  await syncPaintingPercentageFromAssignment(db, assignmentId);
}
