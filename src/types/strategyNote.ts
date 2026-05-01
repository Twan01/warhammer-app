/**
 * StrategyNote entity (STRAT-01..06).
 * Mirrors the unit_strategy_notes table in 001_core_schema.sql + 004_unit_playbook_stats.sql.
 *
 * Save column stores the raw integer (e.g. 3 for a "3+" save). The UI
 * (Phase 9 PlaybookTab) appends the "+" suffix at display time. This matches
 * the locked decision in 06-CONTEXT.md (overrides ARCHITECTURE.md draft).
 */
export interface StrategyNote {
  id: number;
  unit_id: number;
  // Existing columns from 001_core_schema.sql
  battlefield_role: string | null;
  strengths: string | null;
  weaknesses: string | null;
  best_targets: string | null;
  synergies: string | null;
  mistakes_to_avoid: string | null;
  rules_references: string | null;
  notes: string | null;
  // New columns from 004_unit_playbook_stats.sql (all nullable)
  move: number | null;
  toughness: number | null;
  save: number | null;
  wounds: number | null;
  leadership: number | null;
  objective_control: number | null;
  keywords: string | null;
  abilities: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Upsert payload — all 17 user-editable fields plus unit_id.
 * The select-then-insert/update pattern in upsertStrategyNote() handles
 * inferring INSERT vs UPDATE; callers always pass the full set.
 *
 * Every field is nullable so a partial form (e.g. Phase 9 stat row only,
 * with strategy notes left empty) still type-checks.
 */
export interface UpsertStrategyNoteInput {
  unit_id: number;
  // Stat block
  move: number | null;
  toughness: number | null;
  save: number | null;
  wounds: number | null;
  leadership: number | null;
  objective_control: number | null;
  // Free text
  keywords: string | null;
  abilities: string | null;
  // Strategy notes
  battlefield_role: string | null;
  strengths: string | null;
  weaknesses: string | null;
  best_targets: string | null;
  synergies: string | null;
  mistakes_to_avoid: string | null;
  rules_references: string | null;
  notes: string | null;
}
