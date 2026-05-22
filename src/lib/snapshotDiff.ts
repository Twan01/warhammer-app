/**
 * Phase 95 — Pure snapshot diff computation (D-07).
 *
 * Computes added/removed/common units between two parsed snapshots
 * using Set-based name matching (not index-based).
 * No side effects, no DB, no async.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedSnapshotUnit {
  name: string;
  points: number;
  is_warlord: boolean;
  is_ghost: boolean;
}

export interface ParsedSnapshot {
  list: {
    total_points: number;
    enhancement_points: number;
  };
  units: ParsedSnapshotUnit[];
}

export interface SnapshotDiff {
  pointsDelta: number;
  unitsAdded: ParsedSnapshotUnit[];
  unitsRemoved: ParsedSnapshotUnit[];
  unitsCommon: ParsedSnapshotUnit[];
}

// ---------------------------------------------------------------------------
// Diff computation
// ---------------------------------------------------------------------------

/**
 * Build a frequency map of unit names.
 */
function buildFrequencyMap(units: ParsedSnapshotUnit[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const u of units) {
    map.set(u.name, (map.get(u.name) ?? 0) + 1);
  }
  return map;
}

/**
 * Compute the diff between two snapshots.
 *
 * Uses frequency maps to correctly handle duplicate unit names (e.g. two
 * "Intercessors" squads). Each name is matched up to min(countA, countB)
 * times as common; excess copies are added/removed.
 *
 * - pointsDelta = totalB - totalA (positive means B has more points)
 * - unitsAdded = units in B whose count exceeds A's count for that name
 * - unitsRemoved = units in A whose count exceeds B's count for that name
 * - unitsCommon = units paired between A and B (returns A's version)
 */
export function computeSnapshotDiff(
  snapshotA: ParsedSnapshot,
  snapshotB: ParsedSnapshot,
): SnapshotDiff {
  const totalA = snapshotA.list.total_points + snapshotA.list.enhancement_points;
  const totalB = snapshotB.list.total_points + snapshotB.list.enhancement_points;
  const pointsDelta = totalB - totalA;

  const freqA = buildFrequencyMap(snapshotA.units);
  const freqB = buildFrequencyMap(snapshotB.units);

  // Track how many of each name we've consumed from A for common pairing
  const consumedA = new Map<string, number>();

  const unitsCommon: ParsedSnapshotUnit[] = [];
  const unitsRemoved: ParsedSnapshotUnit[] = [];

  for (const unit of snapshotA.units) {
    const countB = freqB.get(unit.name) ?? 0;
    const used = consumedA.get(unit.name) ?? 0;
    if (used < countB) {
      unitsCommon.push(unit);
      consumedA.set(unit.name, used + 1);
    } else {
      unitsRemoved.push(unit);
    }
  }

  // For added: track how many of each name were paired as common from B's side
  const consumedB = new Map<string, number>();
  for (const unit of snapshotB.units) {
    const countA = freqA.get(unit.name) ?? 0;
    const used = consumedB.get(unit.name) ?? 0;
    if (used < countA) {
      consumedB.set(unit.name, used + 1);
    } else {
      // This unit in B has no matching pair in A
    }
  }

  const unitsAdded: ParsedSnapshotUnit[] = [];
  const addedConsumed = new Map<string, number>();
  for (const unit of snapshotB.units) {
    const countA = freqA.get(unit.name) ?? 0;
    const used = addedConsumed.get(unit.name) ?? 0;
    if (used < countA) {
      addedConsumed.set(unit.name, used + 1);
    } else {
      unitsAdded.push(unit);
    }
  }

  return { pointsDelta, unitsAdded, unitsRemoved, unitsCommon };
}
