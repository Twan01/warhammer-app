/**
 * BattleLog entity (BATTLE-01..05).
 * Mirrors the battle_logs table in 001_core_schema.sql exactly.
 *
 * Schema notes:
 * - NO updated_at column — battle_logs has only created_at. Do NOT add updated_at handling.
 * - army_list_id, mvp_unit_id, underperforming_unit_id are nullable FKs with ON DELETE SET NULL.
 *   Update flow uses full-replacement UPDATE (NOT COALESCE) so users can clear them.
 * - battle_date stored as TEXT in YYYY-MM-DD ISO format (no time component).
 * - result is the literal string "Win" | "Loss" | "Draw" — case-sensitive.
 */
export const BATTLE_LOG_RESULTS = ["Win", "Loss", "Draw"] as const;
export type BattleLogResult = typeof BATTLE_LOG_RESULTS[number];

export interface BattleLog {
  id: number;
  army_list_id: number | null;
  battle_date: string; // YYYY-MM-DD
  opponent: string | null;
  opponent_faction: string;
  mission: string;
  points_played: number | null;
  result: BattleLogResult;
  my_score: number | null;
  opponent_score: number | null;
  mvp_unit_id: number | null;
  underperforming_unit_id: number | null;
  lessons_learned: string | null;
  changes_next_time: string | null;
  notes: string | null;
  forgotten_rules: string | null;
  mvp_notes: string | null;
  underperformer_notes: string | null;
  promoted_to_reminder: number;
  created_at: string;
  // NO updated_at — schema does not have one
}

export type CreateBattleLogInput = Omit<BattleLog, "id" | "created_at" | "promoted_to_reminder">;
export type UpdateBattleLogInput = CreateBattleLogInput & { id: number };
