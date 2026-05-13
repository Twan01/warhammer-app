/**
 * Phase 66 — Warning classification (LV-01) and list health aggregation (LV-04).
 *
 * Pure functions: no DB, no hooks, no React imports. Takes data in, returns
 * typed result, no side effects. Follows the computeWorkflowPosition pattern.
 *
 * Two severity levels per D-02:
 * - Hard: points exceeded (list can't legally be played as-is)
 * - Soft: informational (unpainted, not assembled, override, unknown pts, stale)
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
// computeUnitWarnings
// ---------------------------------------------------------------------------

/**
 * Classifies warnings for a single unit in an army list.
 *
 * Points-exceeded is a list-level condition (D-04, Pitfall 4) — it uses
 * the totalPoints/pointsLimit from WarningContext, not per-unit data.
 */
export function computeUnitWarnings(
  unit: Pick<ArmyListUnitRow, "effective_points" | "points_override" | "status_painting" | "status_assembly">,
  context: WarningContext,
): UnitWarnings {
  const hard: string[] = [];
  const soft: string[] = [];

  // Hard: points exceeded when pointsLimit is set and total exceeds it
  if (context.pointsLimit !== null && context.totalPoints > context.pointsLimit) {
    hard.push("Points exceeded");
  }

  // Soft warnings
  if (unit.status_painting !== "Completed") soft.push("Not painted");
  if (unit.status_assembly === 0) soft.push("Not assembled");
  if (unit.points_override !== null) soft.push("Manual override");
  if (unit.effective_points === 0) soft.push("Unknown points");
  if (context.freshness === "stale" || context.freshness === "never") {
    soft.push("Stale points");
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
 * - Warning counts iterate computeUnitWarnings per unit
 */
export function computeListHealthStats(
  units: ArmyListUnitRow[],
  pointsLimit: number | null,
  freshness: SyncFreshness,
): ListHealthStats {
  const totalPoints = units.reduce((sum, u) => sum + u.effective_points, 0);

  const paintedPoints = units
    .filter((u) => u.status_painting === "Completed")
    .reduce((sum, u) => sum + u.effective_points, 0);

  const battleReadyPct =
    totalPoints > 0 ? Math.round((paintedPoints / totalPoints) * 100) : 0;

  const pointsExceeded =
    pointsLimit !== null && totalPoints > pointsLimit;

  const context: WarningContext = { totalPoints, pointsLimit, freshness };

  let hardWarningCount = pointsExceeded ? 1 : 0;
  let softWarningCount = 0;
  for (const unit of units) {
    const warnings = computeUnitWarnings(unit, context);
    hardWarningCount += warnings.hard.filter((w) => w !== "Points exceeded").length;
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
