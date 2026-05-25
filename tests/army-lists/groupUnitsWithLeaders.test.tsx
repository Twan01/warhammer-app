/**
 * Phase 92 — LDR-02: groupUnitsWithLeaders unit tests.
 *
 * Verifies the pure reorder function that places attached leaders
 * immediately after their target unit for visual grouping (D-06, D-07).
 */
import { describe, it, expect } from "vitest";
import { groupUnitsWithLeaders } from "@/lib/groupUnitsWithLeaders";
import type { ArmyListUnitRow } from "@/types/armyList";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nextId = 1;

function makeUnit(
  overrides: Partial<ArmyListUnitRow> = {},
): ArmyListUnitRow {
  const id = overrides.id ?? nextId++;
  return {
    id,
    list_id: 1,
    unit_id: overrides.unit_id ?? id,
    ghost_unit_name: overrides.ghost_unit_name ?? null,
    is_warlord: 0,
    selected_model_count: null,
    leader_attached_to_id: null,
    points_override: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    unit_name: overrides.unit_name ?? `Unit ${id}`,
    canonical_name: null,
    unit_points: overrides.unit_points ?? 100,
    effective_points: overrides.effective_points ?? 100,
    faction_id: overrides.faction_id ?? 1,
    status_assembly: null,
    status_painting: null,
    painting_percentage: null,
    tactical_role: null,
    synced_points: null,
    override_points: null,
    tier_points: null,
    ...overrides,
  };
}

// Reset auto-increment between describes
beforeEach(() => {
  nextId = 1;
});

describe("groupUnitsWithLeaders", () => {
  // ---------------------------------------------------------------------------
  // Test 1: No attachments — units unchanged
  // ---------------------------------------------------------------------------

  it("returns units unchanged when no leader_attached_to_id is set", () => {
    const units = [
      makeUnit({ id: 1, unit_name: "Intercessors" }),
      makeUnit({ id: 2, unit_name: "Hellblasters" }),
      makeUnit({ id: 3, unit_name: "Eradicators" }),
    ];

    const result = groupUnitsWithLeaders(units);

    expect(result).toHaveLength(3);
    expect(result.map((g) => g.unit.unit_name)).toEqual([
      "Intercessors",
      "Hellblasters",
      "Eradicators",
    ]);
    expect(result.every((g) => g.isIndentedLeader === false)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Test 2: Single leader-target pair reorders correctly
  // ---------------------------------------------------------------------------

  it("moves an attached leader immediately after its target", () => {
    const units = [
      makeUnit({ id: 10, unit_name: "Captain" , leader_attached_to_id: 20 }),
      makeUnit({ id: 20, unit_name: "Intercessors" }),
      makeUnit({ id: 30, unit_name: "Hellblasters" }),
    ];

    const result = groupUnitsWithLeaders(units);

    expect(result).toHaveLength(3);
    expect(result.map((g) => g.unit.unit_name)).toEqual([
      "Intercessors",
      "Captain",
      "Hellblasters",
    ]);
    expect(result[0].isIndentedLeader).toBe(false);
    expect(result[1].isIndentedLeader).toBe(true);
    expect(result[2].isIndentedLeader).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Test 3: Multiple leader-target pairs
  // ---------------------------------------------------------------------------

  it("groups multiple leader-target pairs correctly", () => {
    const units = [
      makeUnit({ id: 1, unit_name: "Captain",    leader_attached_to_id: 3 }),
      makeUnit({ id: 2, unit_name: "Librarian",  leader_attached_to_id: 4 }),
      makeUnit({ id: 3, unit_name: "Intercessors" }),
      makeUnit({ id: 4, unit_name: "Hellblasters" }),
      makeUnit({ id: 5, unit_name: "Eradicators" }),
    ];

    const result = groupUnitsWithLeaders(units);

    expect(result).toHaveLength(5);
    expect(result.map((g) => g.unit.unit_name)).toEqual([
      "Intercessors",
      "Captain",
      "Hellblasters",
      "Librarian",
      "Eradicators",
    ]);
    expect(result[1].isIndentedLeader).toBe(true);
    expect(result[3].isIndentedLeader).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Test 4: Orphaned leader (target not in array) is dropped
  // ---------------------------------------------------------------------------

  it("drops a leader whose target does not exist in the array", () => {
    const units = [
      makeUnit({ id: 1, unit_name: "Captain",      leader_attached_to_id: 999 }),
      makeUnit({ id: 2, unit_name: "Intercessors" }),
    ];

    const result = groupUnitsWithLeaders(units);

    expect(result).toHaveLength(1);
    expect(result[0].unit.unit_name).toBe("Intercessors");
    expect(result[0].isIndentedLeader).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Test 5: Empty array returns empty array
  // ---------------------------------------------------------------------------

  it("returns empty array for empty input", () => {
    const result = groupUnitsWithLeaders([]);
    expect(result).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Test 6: Ghost units with leader attachment
  // ---------------------------------------------------------------------------

  it("groups ghost units (unit_id=null) with leader_attached_to_id correctly", () => {
    const units = [
      makeUnit({
        id: 10,
        unit_id: null,
        ghost_unit_name: "Ghost Captain",
        unit_name: "Ghost Captain",
        leader_attached_to_id: 20,
      }),
      makeUnit({ id: 20, unit_name: "Intercessors" }),
      makeUnit({ id: 30, unit_name: "Hellblasters" }),
    ];

    const result = groupUnitsWithLeaders(units);

    expect(result).toHaveLength(3);
    expect(result.map((g) => g.unit.unit_name)).toEqual([
      "Intercessors",
      "Ghost Captain",
      "Hellblasters",
    ]);
    expect(result[1].isIndentedLeader).toBe(true);
    expect(result[1].unit.unit_id).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Immutability: original array is not mutated
  // ---------------------------------------------------------------------------

  it("does not mutate the input array", () => {
    const units = [
      makeUnit({ id: 1, unit_name: "Captain", leader_attached_to_id: 2 }),
      makeUnit({ id: 2, unit_name: "Intercessors" }),
    ];
    const originalLength = units.length;
    const originalFirst = units[0];

    groupUnitsWithLeaders(units);

    expect(units).toHaveLength(originalLength);
    expect(units[0]).toBe(originalFirst);
  });
});
