import { getDb } from "@/db/client";
import type {
  BattleLog,
  CreateBattleLogInput,
  UpdateBattleLogInput,
} from "@/types/battleLog";

/**
 * Battle log queries (BATTLE-01..05).
 *
 * Critical contracts:
 * - updateBattleLog uses full-replacement UPDATE (SET army_list_id=$2,
 *   mvp_unit_id=$11, underperforming_unit_id=$12) — NOT COALESCE — so the user
 *   can clear all three nullable FKs back to NULL (RESEARCH Pitfall 5).
 * - getBattleLogs sorts by battle_date DESC then created_at DESC so manually-
 *   entered historical games appear in the right position (RESEARCH Pitfall 2).
 * - battle_date is written as YYYY-MM-DD only — no time component (RESEARCH Pitfall 6).
 * - getBattleLogSummary returns one row per distinct `result` value via GROUP BY.
 *   The pure function computeBattleLogSummary aggregates these rows in JS.
 */

export async function getBattleLogs(): Promise<BattleLog[]> {
  const db = await getDb();
  return db.select<BattleLog[]>(
    "SELECT * FROM battle_logs ORDER BY battle_date DESC, created_at DESC"
  );
}

export async function getBattleLogSummary(): Promise<{ result: string; count: number }[]> {
  const db = await getDb();
  return db.select<{ result: string; count: number }[]>(
    "SELECT result, COUNT(*) AS count FROM battle_logs GROUP BY result"
  );
}

export async function createBattleLog(input: CreateBattleLogInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO battle_logs
       (army_list_id, battle_date, opponent, opponent_faction, mission,
        points_played, result, my_score, opponent_score,
        mvp_unit_id, underperforming_unit_id,
        lessons_learned, changes_next_time, notes,
        forgotten_rules, mvp_notes, underperformer_notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [
      input.army_list_id ?? null,
      input.battle_date,
      input.opponent ?? null,
      input.opponent_faction,
      input.mission,
      input.points_played ?? null,
      input.result,
      input.my_score ?? null,
      input.opponent_score ?? null,
      input.mvp_unit_id ?? null,
      input.underperforming_unit_id ?? null,
      input.lessons_learned ?? null,
      input.changes_next_time ?? null,
      input.notes ?? null,
      input.forgotten_rules ?? null,
      input.mvp_notes ?? null,
      input.underperformer_notes ?? null,
    ]
  );
  return result.lastInsertId ?? 0;
}

/**
 * Full-replacement UPDATE — Pitfall 5.
 * army_list_id, mvp_unit_id, underperforming_unit_id MUST be clearable to NULL.
 * Do NOT use COALESCE for any column here.
 */
export async function updateBattleLog(input: UpdateBattleLogInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE battle_logs SET
       army_list_id = $2, battle_date = $3, opponent = $4,
       opponent_faction = $5, mission = $6, points_played = $7,
       result = $8, my_score = $9, opponent_score = $10,
       mvp_unit_id = $11, underperforming_unit_id = $12,
       lessons_learned = $13, changes_next_time = $14, notes = $15,
       forgotten_rules = $16, mvp_notes = $17, underperformer_notes = $18
     WHERE id = $1`,
    [
      input.id,
      input.army_list_id ?? null,
      input.battle_date,
      input.opponent ?? null,
      input.opponent_faction,
      input.mission,
      input.points_played ?? null,
      input.result,
      input.my_score ?? null,
      input.opponent_score ?? null,
      input.mvp_unit_id ?? null,
      input.underperforming_unit_id ?? null,
      input.lessons_learned ?? null,
      input.changes_next_time ?? null,
      input.notes ?? null,
      input.forgotten_rules ?? null,
      input.mvp_notes ?? null,
      input.underperformer_notes ?? null,
    ]
  );
}

export async function getRecentForgottenRules(armyListId: number): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<{ forgotten_rules: string }[]>(
    `SELECT forgotten_rules FROM battle_logs
     WHERE army_list_id = $1 AND forgotten_rules IS NOT NULL
     ORDER BY battle_date DESC, created_at DESC
     LIMIT 3`,
    [armyListId],
  );
  const seen = new Set<string>();
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.forgotten_rules);
      if (Array.isArray(parsed)) {
        for (const rule of parsed) {
          if (typeof rule === "string" && rule.length > 0) {
            seen.add(rule);
          }
        }
      }
    } catch {
      // Silently skip malformed forgotten_rules JSON entries
    }
  }
  return [...seen];
}

export async function deleteBattleLog(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM battle_logs WHERE id = $1", [id]);
}
