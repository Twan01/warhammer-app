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
 * Compute the diff between two snapshots.
 *
 * - pointsDelta = totalB - totalA (positive means B has more points)
 * - unitsAdded = units in B but not in A (by name)
 * - unitsRemoved = units in A but not in B (by name)
 * - unitsCommon = units in both A and B (by name, returns A's version)
 */
export function computeSnapshotDiff(
  snapshotA: ParsedSnapshot,
  snapshotB: ParsedSnapshot,
): SnapshotDiff {
  const totalA = snapshotA.list.total_points + snapshotA.list.enhancement_points;
  const totalB = snapshotB.list.total_points + snapshotB.list.enhancement_points;
  const pointsDelta = totalB - totalA;

  const namesA = new Set(snapshotA.units.map((u) => u.name));
  const namesB = new Set(snapshotB.units.map((u) => u.name));

  const unitsAdded = snapshotB.units.filter((u) => !namesA.has(u.name));
  const unitsRemoved = snapshotA.units.filter((u) => !namesB.has(u.name));
  const unitsCommon = snapshotA.units.filter((u) => namesB.has(u.name));

  return { pointsDelta, unitsAdded, unitsRemoved, unitsCommon };
}
