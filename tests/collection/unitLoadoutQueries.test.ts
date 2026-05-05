import { describe, it, expect, vi, beforeEach } from "vitest";

// TODO(24-02): vi.mock("@/db/client") — mock getDb for SQL assertions

describe.skip("unitLoadoutQueries", () => {
  // LOAD-01: getUnitLoadouts returns all loadouts for a unit including wargear
  describe("getUnitLoadouts", () => {
    it.skip("returns all loadouts for a unit with nested wargear arrays", () => {
      // TODO(24-02): Mock db.select for loadouts query, then for wargear query per loadout
      // Assert getUnitLoadouts(1) returns loadout objects with wargear: [] arrays
    });

    it.skip("returns empty array when unit has no loadouts", () => {
      // TODO(24-02): Mock db.select to return []
      // Assert getUnitLoadouts(999) returns []
    });
  });

  // LOAD-02: activateLoadout sets is_active=1 on target and 0 on all others
  describe("activateLoadout", () => {
    it.skip("deactivates all loadouts for unit then activates the target", () => {
      // TODO(24-02): Call activateLoadout(loadoutId=2, unitId=1)
      // Assert first db.execute: UPDATE unit_loadouts SET is_active = 0 WHERE unit_id = $1 [1]
      // Assert second db.execute: UPDATE unit_loadouts SET is_active = 1 WHERE id = $1 [2]
    });
  });

  // LOAD-03: createLoadout and deleteLoadout round-trip
  describe("createLoadout", () => {
    it.skip("inserts a new loadout row and returns the id", () => {
      // TODO(24-02): Call createLoadout({ unit_id: 1, name: "Anti-tank" })
      // Assert db.execute called with INSERT INTO unit_loadouts
      // Assert returned id matches lastInsertId
    });
  });

  describe("deleteLoadout", () => {
    it.skip("deletes loadout by id (CASCADE removes wargear)", () => {
      // TODO(24-02): Call deleteLoadout(5)
      // Assert db.execute called with DELETE FROM unit_loadouts WHERE id = $1 [5]
    });
  });

  describe("addWargearToLoadout", () => {
    it.skip("inserts a wargear row linked to a loadout", () => {
      // TODO(24-02): Call addWargearToLoadout({ loadout_id: 2, weapon_name: "Bolt Rifle", weapon_line: 1, is_manual: false })
      // Assert db.execute with INSERT INTO unit_loadout_wargear
    });
  });

  describe("removeWargearFromLoadout", () => {
    it.skip("deletes a wargear row by id", () => {
      // TODO(24-02): Call removeWargearFromLoadout(10)
      // Assert db.execute with DELETE FROM unit_loadout_wargear WHERE id = $1 [10]
    });
  });
});
