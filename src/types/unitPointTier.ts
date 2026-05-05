/**
 * Phase 24 — Point tier for model-count brackets.
 * Mirrors unit_point_tiers table in 011_point_tiers_loadouts.sql.
 *
 * When tiers exist for a unit, the active tier's points value is written to
 * units.points — preserving the existing COALESCE chain in getArmyListWithUnits.
 */
export interface UnitPointTier {
  id: number;
  unit_id: number;
  model_count: number;
  points: number;
  created_at: string;
}

export interface CreateUnitPointTierInput {
  unit_id: number;
  model_count: number;
  points: number;
}
