/**
 * UnitOverride entity (OVRD-01..04).
 * Mirrors the unit_overrides table in 017_unit_overrides.sql.
 *
 * One row per unit in hobbyforge.db. All override columns are nullable —
 * NULL means "use the value imported from rules.db (Wahapedia)".
 * Lives in hobbyforge.db because rules.db is fully wiped on every sync.
 *
 * Separate from unit_strategy_notes (personal gameplay notes).
 * Overrides affect army list effective_points via the COALESCE chain:
 * COALESCE(alu.points_override, uo.points, u.points, 0).
 */
export interface UnitOverride {
  id: number;
  unit_id: number;
  points: number | null;
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
 * Upsert payload — all user-editable override fields plus unit_id.
 * The select-then-insert/update pattern in upsertUnitOverride() handles
 * inferring INSERT vs UPDATE; callers always pass the full set.
 *
 * Every field is nullable so a partial override (e.g. only points set,
 * stats remain null) still type-checks.
 */
export type UpsertUnitOverrideInput = {
  unit_id: number;
  points: number | null;
  move: number | null;
  toughness: number | null;
  save: number | null;
  wounds: number | null;
  leadership: number | null;
  objective_control: number | null;
  keywords: string | null;
  abilities: string | null;
};
