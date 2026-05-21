/**
 * Phase 92 — Leader attachment visual grouping (LDR-02, D-06/D-07).
 *
 * Pure function: no DB, no hooks, no async. Takes a flat array of
 * ArmyListUnitRow and returns a new array where attached leaders
 * appear immediately after their target unit, annotated with an
 * isIndentedLeader flag for UI indentation.
 *
 * Rules:
 * - Unattached units keep their original insertion-order position.
 * - Attached leaders (leader_attached_to_id != null) are removed from
 *   their original position and placed after their target.
 * - Orphaned leaders (target not in the array) are dropped from output.
 * - Input array is never mutated.
 */

import type { ArmyListUnitRow } from "@/types/armyList";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GroupedUnit {
  unit: ArmyListUnitRow;
  isIndentedLeader: boolean;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function groupUnitsWithLeaders(units: ArmyListUnitRow[]): GroupedUnit[] {
  // 1. Build map: target id -> array of leader units attached to it
  const leadersByTarget = new Map<number, ArmyListUnitRow[]>();

  // 2. Build set of unit IDs that are attached leaders
  const attachedLeaderIds = new Set<number>();

  for (const unit of units) {
    if (unit.leader_attached_to_id != null) {
      attachedLeaderIds.add(unit.id);
      const existing = leadersByTarget.get(unit.leader_attached_to_id);
      if (existing) {
        existing.push(unit);
      } else {
        leadersByTarget.set(unit.leader_attached_to_id, [unit]);
      }
    }
  }

  // 3. Build set of all unit IDs present in the array (for orphan detection)
  const presentIds = new Set(units.map((u) => u.id));

  // 4. Iterate in original order, emit targets then their leaders
  const result: GroupedUnit[] = [];

  for (const unit of units) {
    // Skip attached leaders — they'll be emitted after their target
    if (attachedLeaderIds.has(unit.id)) {
      continue;
    }

    // Emit the non-leader unit
    result.push({ unit, isIndentedLeader: false });

    // Emit any leaders attached to this unit
    const leaders = leadersByTarget.get(unit.id);
    if (leaders) {
      for (const leader of leaders) {
        result.push({ unit: leader, isIndentedLeader: true });
      }
    }
  }

  // Orphaned leaders (target not in presentIds) are naturally excluded:
  // they were skipped in the main loop (attachedLeaderIds) and their
  // target never appeared to emit them from leadersByTarget.
  // The presentIds set is kept for clarity but the algorithm handles it implicitly.

  return result;
}
