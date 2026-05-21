/**
 * Phase 66/76 — Warning classification (LV-01) and list health aggregation (LV-04).
 *
 * Pure functions: no DB, no hooks, no React imports. Takes data in, returns
 * typed result, no side effects. Follows the computeWorkflowPosition pattern.
 *
 * Two severity levels per D-02:
 * - Hard: points exceeded (list can't legally be played as-is)
 * - Soft: informational (unpainted, not assembled, override, unknown pts, stale)
 *
 * Phase 76 split (D-11/D-12):
 * - computeUnitWarnings: unit-level conditions only (not painted, not assembled,
 *   manual override, unknown points)
 * - computeListWarnings: list-level conditions only (points exceeded, stale data)
 */
import type { SyncFreshness } from "@/lib/syncFreshness";
import type { ArmyListUnitRow } from "@/types/armyList";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UnitWarnings {
  hard: string[];
  soft: string[];
}

export interface WarningContext {
  totalPoints: number;
  pointsLimit: number | null;
  freshness: SyncFreshness;
}

export interface ListHealthStats {
  totalPoints: number;
  pointsLimit: number | null;
  ownershipPct: number;
  battleReadyPct: number;
  hardWarningCount: number;
  softWarningCount: number;
  pointsExceeded: boolean;
}

// ---------------------------------------------------------------------------
// computeUnitWarnings (unit-level only)
// ---------------------------------------------------------------------------

/**
 * Classifies warnings for a single unit in an army list.
 * After Phase 76 split, contains ONLY unit-level conditions.
 * List-level conditions (points exceeded, stale data) are in computeListWarnings.
 */
export function computeUnitWarnings(
  unit: Pick<ArmyListUnitRow, "effective_points" | "points_override" | "status_painting" | "status_assembly">,
  _context: WarningContext,
): UnitWarnings {
  const hard: string[] = [];
  const soft: string[] = [];

  // Soft warnings (unit-level only)
  if (unit.status_painting !== "Completed") soft.push("Not painted");
  if (unit.status_assembly === 0) soft.push("Not assembled");
  if (unit.points_override !== null) soft.push("Manual override");
  if (unit.effective_points === 0) soft.push("Unknown points");

  return { hard, soft };
}

// ---------------------------------------------------------------------------
// computeListWarnings (list-level only)
// ---------------------------------------------------------------------------

/**
 * Classifies warnings at the list level — conditions that apply once to the
 * entire army list, not per-unit. Separated from computeUnitWarnings in Phase 76
 * per D-11 to avoid duplicating "Points exceeded" across every unit row.
 */
export function computeListWarnings(context: WarningContext): UnitWarnings {
  const hard: string[] = [];
  const soft: string[] = [];

  // Hard: points exceeded when pointsLimit is set and total exceeds it
  if (context.pointsLimit !== null && context.totalPoints > context.pointsLimit) {
    hard.push("Points exceeded");
  }

  // Soft: stale or never-synced points data
  if (context.freshness === "stale" || context.freshness === "never") {
    soft.push("Stale points data");
  }

  return { hard, soft };
}

// ---------------------------------------------------------------------------
// computeListHealthStats
// ---------------------------------------------------------------------------

/**
 * Aggregates health statistics for an entire army list.
 *
 * - ownershipPct is always 100 per D-15 (FK constraint means all units are owned)
 * - battleReadyPct = round((paintedPoints / totalPoints) * 100) or 0
 * - Warning counts: list-level from computeListWarnings, unit-level per unit
 */
export function computeListHealthStats(
  units: ArmyListUnitRow[],
  pointsLimit: number | null,
  freshness: SyncFreshness,
  enhancementTotal = 0,
): ListHealthStats {
  const unitPoints = units.reduce((sum, u) => sum + u.effective_points, 0);
  const totalPoints = unitPoints + enhancementTotal;

  const paintedPoints = units
    .filter((u) => u.status_painting === "Completed")
    .reduce((sum, u) => sum + u.effective_points, 0);

  const battleReadyPct =
    totalPoints > 0 ? Math.round((paintedPoints / totalPoints) * 100) : 0;

  const pointsExceeded =
    pointsLimit !== null && totalPoints > pointsLimit;

  const context: WarningContext = { totalPoints, pointsLimit, freshness };

  // List-level warnings (counted once)
  const listWarnings = computeListWarnings(context);
  let hardWarningCount = listWarnings.hard.length;
  let softWarningCount = listWarnings.soft.length;

  // Unit-level warnings (accumulated across all units)
  for (const unit of units) {
    const warnings = computeUnitWarnings(unit, context);
    hardWarningCount += warnings.hard.length;
    softWarningCount += warnings.soft.length;
  }

  return {
    totalPoints,
    pointsLimit,
    ownershipPct: 100,
    battleReadyPct,
    hardWarningCount,
    softWarningCount,
    pointsExceeded,
  };
}
