import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LoadoutWargear } from "@/types/unitLoadout";

vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/db/client";
import {
  getUnitLoadouts,
  createLoadout,
  deleteLoadout,
  activateLoadout,
  addWargearToLoadout,
  removeWargearFromLoadout,
} from "@/db/queries/unitLoadouts";

const mockDb = {
  select: vi.fn(),
  execute: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDb).mockResolvedValue(mockDb as never);
});

describe("unitLoadoutQueries", () => {
  // LOAD-01: getUnitLoadouts returns all loadouts for a unit including wargear
  describe("getUnitLoadouts", () => {
    it("returns all loadouts for a unit with nested wargear arrays", async () => {
      const loadoutRows = [
        { id: 1, unit_id: 1, name: "Anti-tank", is_active: 1 as const, created_at: "2026-01-01", updated_at: "2026-01-01" },
        { id: 2, unit_id: 1, name: "Anti-infantry", is_active: 0 as const, created_at: "2026-01-01", updated_at: "2026-01-01" },
      ];
      const wargearRows: LoadoutWargear[] = [
        { id: 10, loadout_id: 1, weapon_name: "Lascannon", weapon_line: 1, is_manual: 0, created_at: "2026-01-01" },
      ];
      mockDb.select
        .mockResolvedValueOnce(loadoutRows)
        .mockResolvedValueOnce(wargearRows);

      const result = await getUnitLoadouts(1);
      expect(result).toHaveLength(2);
      expect(result[0].wargear).toHaveLength(1);
      expect(result[0].wargear[0].weapon_name).toBe("Lascannon");
      expect(result[1].wargear).toHaveLength(0);
    });

    it("returns empty array when unit has no loadouts", async () => {
      mockDb.select.mockResolvedValueOnce([]);
      const result = await getUnitLoadouts(999);
      expect(result).toEqual([]);
    });
  });

  // LOAD-02: activateLoadout sets is_active=1 on target and 0 on all others
  describe("activateLoadout", () => {
    it("atomically sets is_active via CASE expression in a single UPDATE", async () => {
      mockDb.execute.mockResolvedValue({ rowsAffected: 2 });
      await activateLoadout(2, 1);
      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("CASE WHEN id = $1 THEN 1 ELSE 0 END"),
        [2, 1],
      );
    });
  });

  // LOAD-03: createLoadout and deleteLoadout round-trip
  describe("createLoadout", () => {
    it("inserts a new loadout row and returns the id", async () => {
      mockDb.execute.mockResolvedValue({ lastInsertId: 5, rowsAffected: 1 });
      const id = await createLoadout({ unit_id: 1, name: "Anti-tank" });
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO unit_loadouts"),
        [1, "Anti-tank"],
      );
      expect(id).toBe(5);
    });
  });

  describe("deleteLoadout", () => {
    it("deletes loadout by id (CASCADE removes wargear)", async () => {
      mockDb.execute.mockResolvedValue({ rowsAffected: 1 });
      await deleteLoadout(5);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM unit_loadouts WHERE id = $1"),
        [5],
      );
    });
  });

  describe("addWargearToLoadout", () => {
    it("inserts a wargear row linked to a loadout", async () => {
      mockDb.execute.mockResolvedValue({ lastInsertId: 10, rowsAffected: 1 });
      const id = await addWargearToLoadout({
        loadout_id: 2,
        weapon_name: "Bolt Rifle",
        weapon_line: 1,
        is_manual: false,
      });
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO unit_loadout_wargear"),
        [2, "Bolt Rifle", 1, 0],
      );
      expect(id).toBe(10);
    });
  });

  describe("removeWargearFromLoadout", () => {
    it("deletes a wargear row by id", async () => {
      mockDb.execute.mockResolvedValue({ rowsAffected: 1 });
      await removeWargearFromLoadout(10);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM unit_loadout_wargear WHERE id = $1"),
        [10],
      );
    });
  });
});
