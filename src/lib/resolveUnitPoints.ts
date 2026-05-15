/**
 * Phase 76 — Centralized points resolver (PV-01, D-01/D-02/D-03).
 *
 * Pure function: no DB, no hooks, no async. Takes the four intermediate
 * column values from the SQL COALESCE chain and returns the resolved
 * points value with a source label.
 *
 * The if-chain order MUST match the SQL COALESCE argument order exactly:
 *   COALESCE(alu.points_override, sup.points, uo.points, u.points, 0)
 *
 * Uses strict null check (!= null) — NOT truthiness — so that 0 is
 * treated as a valid value (a unit can legitimately cost 0 points).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PointsSource = "override" | "synced" | "user-override" | "base" | "unknown";

export interface ResolvedPoints {
  points: number;
  source: PointsSource;
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

export function resolveUnitPoints(row: {
  points_override: number | null;
  synced_points: number | null;
  override_points: number | null;
  unit_points: number | null;
}): ResolvedPoints {
  if (row.points_override != null) return { points: row.points_override, source: "override" };
  if (row.synced_points != null) return { points: row.synced_points, source: "synced" };
  if (row.override_points != null) return { points: row.override_points, source: "user-override" };
  if (row.unit_points != null) return { points: row.unit_points, source: "base" };
  return { points: 0, source: "unknown" };
}
