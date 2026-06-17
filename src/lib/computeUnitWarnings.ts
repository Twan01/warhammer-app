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
import type { ArmyListUnitRow } from "@/types/armyList";

// ---------------------------------------------------------------------------
// Constants — 10th edition matched play Battleline requirements
// ---------------------------------------------------------------------------
const BATTLELINE_THRESHOLD_HIGH = 2000;
const BATTLELINE_MIN_HIGH = 3;
const BATTLELINE_THRESHOLD_LOW = 1000;
const BATTLELINE_MIN_LOW = 2;
const BATTLELINE_MIN_DEFAULT = 1;

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
): UnitWarnings {
  const hard: string[] = [];
  const soft: string[] = [];

  // Soft warnings (unit-level only) — skip for null statuses (ghost/planned units)
  if (unit.status_painting !== null && unit.status_painting !== "Completed") soft.push("Not painted");
  if (unit.status_assembly !== null && unit.status_assembly === 0) soft.push("Not assembled");
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
 *
 * Phase 106 (D-08): BATTLELINE count validation using database-sourced roles.
 * Units parameter provides role data for structural army composition checks.
 * Ghost/unlinked units (unit_id = null) are excluded from role counting.
 */
export function computeListWarnings(
  context: WarningContext,
  units: Array<Pick<ArmyListUnitRow, "udb_role" | "unit_id" | "udb_unit_id" | "udb_keywords">> = [],
): UnitWarnings {
  const hard: string[] = [];
  const soft: string[] = [];

  // Hard: points exceeded when pointsLimit is set and total exceeds it
  if (context.pointsLimit !== null && context.totalPoints > context.pointsLimit) {
    hard.push("Points exceeded");
  }

  // Data is bundled with the app — always up to date.
  // Stale warning removed (was unreachable since Phase 107).

  // Soft: BATTLELINE count check (Phase 106, D-08)
  // Only linked units (unit_id !== null) with a known role are counted
  // 10th edition matched play minimum Battleline requirements
  if (context.pointsLimit !== null) {
    const battlelineCount = units.filter(
      (u) => u.unit_id !== null && u.udb_role?.toLowerCase() === "battleline",
    ).length;

    const minBattleline =
      context.pointsLimit >= BATTLELINE_THRESHOLD_HIGH ? BATTLELINE_MIN_HIGH
        : context.pointsLimit >= BATTLELINE_THRESHOLD_LOW ? BATTLELINE_MIN_LOW
        : BATTLELINE_MIN_DEFAULT;

    if (battlelineCount < minBattleline) {
      soft.push(`Needs ${minBattleline} Battleline (have ${battlelineCount})`);
    }

    // Soft: DEDICATED TRANSPORT cap (Phase 110, D-09)
    // Transport count must not exceed the number of non-transport, non-character units
    const linkedUnits = units.filter((u) => u.unit_id !== null);
    const transportCount = linkedUnits.filter(
      (u) => u.udb_role?.toLowerCase() === "dedicated transport",
    ).length;
    const nonTransportNonCharacterCount = linkedUnits.filter(
      (u) =>
        u.udb_role !== null &&
        u.udb_role?.toLowerCase() !== "dedicated transport" &&
        u.udb_role?.toLowerCase() !== "character",
    ).length;
    if (transportCount > 0 && transportCount > nonTransportNonCharacterCount) {
      soft.push("DEDICATED TRANSPORT count exceeds non-transport, non-character units");
    }

    // Soft: EPIC HERO uniqueness (Phase 110, D-09)
    // An EPIC HERO unit (identified by udb_unit_id) must not appear more than once
    const epicHeroIds = linkedUnits
      .filter(
        (u) =>
          u.unit_id !== null &&
          u.udb_keywords?.toLowerCase().includes("epic hero"),
      )
      .map((u) => u.udb_unit_id)
      .filter((id): id is string => id !== null);
    const hasDuplicateEpicHero = epicHeroIds.some(
      (id, idx) => epicHeroIds.indexOf(id) !== idx,
    );
    if (hasDuplicateEpicHero) {
      soft.push("EPIC HERO must be unique (duplicate detected)");
    }
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
 * - enhancementTotal (Phase 91, ENH-03): optional points from assigned
 *   enhancements, added to totalPoints for the points-exceeded check
 */
export function computeListHealthStats(
  units: ArmyListUnitRow[],
  pointsLimit: number | null,
  enhancementTotal = 0,
): ListHealthStats {
  const unitPoints = units.reduce((sum, u) => sum + u.effective_points, 0);
  const totalPoints = unitPoints + enhancementTotal;

  const paintedPoints = units
    .filter((u) => u.status_painting === "Completed")
    .reduce((sum, u) => sum + u.effective_points, 0);

  const battleReadyPct =
    unitPoints > 0 ? Math.round((paintedPoints / unitPoints) * 100) : 0;

  const pointsExceeded =
    pointsLimit !== null && totalPoints > pointsLimit;

  const context: WarningContext = { totalPoints, pointsLimit };

  // List-level warnings (counted once) — pass units for BATTLELINE count (Phase 106)
  const listWarnings = computeListWarnings(context, units);
  let hardWarningCount = listWarnings.hard.length;
  let softWarningCount = listWarnings.soft.length;

  // Unit-level warnings (accumulated across all units)
  for (const unit of units) {
    const warnings = computeUnitWarnings(unit);
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
