/**
 * Phase 76 — Centralized points resolver (PV-01, D-01/D-02/D-03).
 * Phase 89 — Extended with tier_points (D-08).
 * Phase 106 — Rewired to FK-based resolution via udb_unit_points (5-level COALESCE chain).
 *
 * Pure function: no DB, no hooks, no async. Takes the five intermediate
 * column values from the SQL COALESCE chain and returns the resolved
 * points value with a source label.
 *
 * The if-chain order MUST match the SQL COALESCE argument order exactly:
 *   COALESCE(alu.points_override, udb_tier.points, udb_base.points, uo.points, u.points, 0)
 *
 * Uses strict null check (!= null) — NOT truthiness — so that 0 is
 * treated as a valid value (a unit can legitimately cost 0 points).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PointsSource = "override" | "tier" | "database" | "user-override" | "base" | "unknown";

export interface ResolvedPoints {
  points: number;
  source: PointsSource;
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

export function resolveUnitPoints(row: {
  points_override: number | null;
  tier_points: number | null;       // from udb_unit_points (tier match)
  udb_base_points: number | null;   // from udb_unit_points (min tier)
  override_points: number | null;   // from unit_overrides
  unit_points: number | null;       // from units.points
}): ResolvedPoints {
  if (row.points_override != null)  return { points: row.points_override,  source: "override" };
  if (row.tier_points != null)      return { points: row.tier_points,      source: "tier" };
  if (row.udb_base_points != null)  return { points: row.udb_base_points,  source: "database" };
  if (row.override_points != null)  return { points: row.override_points,  source: "user-override" };
  if (row.unit_points != null)      return { points: row.unit_points,      source: "base" };
  return { points: 0, source: "unknown" };
}
