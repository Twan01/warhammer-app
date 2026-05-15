/**
 * UnitRulesMapping entity (PV-03..05, D-06).
 * Mirrors the unit_rules_mapping table in 026_unit_rules_mapping.sql.
 *
 * One row per unit in hobbyforge.db. Links a collection unit to its
 * rules datasheet entry (from rules.db sync or manual selection).
 *
 * match_status tracks how the mapping was established:
 * - "auto": system auto-matched by name during sync
 * - "confirmed": user verified the auto-match is correct
 * - "manual": user manually selected a different datasheet
 */

export const MATCH_STATUSES = ["auto", "confirmed", "manual"] as const;
export type MatchStatus = typeof MATCH_STATUSES[number];

export interface UnitRulesMapping {
  id: number;
  unit_id: number;
  rules_datasheet_id: string | null;
  match_status: MatchStatus;
  source: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Upsert payload — all user-editable fields plus unit_id.
 * The select-then-insert/update pattern in upsertUnitRulesMapping()
 * handles inferring INSERT vs UPDATE; callers always pass the full set.
 */
export type UpsertUnitRulesMappingInput = {
  unit_id: number;
  rules_datasheet_id: string | null;
  match_status: MatchStatus;
  source?: string | null;
};
