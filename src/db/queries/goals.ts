import { getDb } from "@/db/client";
import type { HobbyGoal, CreateGoalInput, UpdateGoalInput } from "@/types/goal";
import { computeGoalPeriod } from "@/features/goals/computeGoalPeriod";

/**
 * Hobby Goals CRUD + progress queries (ANLY-01..02).
 *
 * SQL contracts:
 * - getGoals: ordered by created_at DESC (newest first)
 * - getGoalProgress: counts DISTINCT unit_id from painting_sessions filtered
 *   by period boundaries derived via computeGoalPeriod (not stored in DB)
 * - All params use $1/$2 positional syntax (tauri-plugin-sql requirement)
 */

export async function getGoals(): Promise<HobbyGoal[]> {
  const db = await getDb();
  return db.select<HobbyGoal[]>(
    "SELECT * FROM hobby_goals ORDER BY created_at DESC"
  );
}

export async function createGoal(input: CreateGoalInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    "INSERT INTO hobby_goals (name, target_count, timeframe, period) VALUES ($1, $2, $3, $4)",
    [input.name, input.target_count, input.timeframe, input.period]
  );
  return result.lastInsertId ?? 0;
}

export async function updateGoal(input: UpdateGoalInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE hobby_goals SET name = $1, target_count = $2, timeframe = $3, period = $4 WHERE id = $5",
    [input.name, input.target_count, input.timeframe, input.period, input.id]
  );
}

export async function deleteGoal(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM hobby_goals WHERE id = $1", [id]);
}

/**
 * Returns a Map<goalId, progressCount> for each goal.
 * Progress = count of DISTINCT unit_id in painting_sessions within the goal's period.
 * Period boundaries are computed at query time from computeGoalPeriod (not stored).
 */
export async function getGoalProgress(
  goals: HobbyGoal[]
): Promise<Map<number, number>> {
  if (goals.length === 0) return new Map();
  const db = await getDb();
  const result = new Map<number, number>();
  await Promise.all(
    goals.map(async (goal) => {
      const { startDate, endDate } = computeGoalPeriod(goal.timeframe, goal.period);
      const rows = await db.select<{ progress_count: number }[]>(
        "SELECT COUNT(DISTINCT unit_id) AS progress_count FROM painting_sessions WHERE session_date >= $1 AND session_date <= $2",
        [startDate, endDate]
      );
      result.set(goal.id, rows[0]?.progress_count ?? 0);
    })
  );
  return result;
}
