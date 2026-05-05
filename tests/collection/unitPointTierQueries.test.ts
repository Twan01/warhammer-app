import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UnitPointTier } from "@/types/unitPointTier";

vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/db/client";
import {
  getUnitPointTiers,
  upsertUnitPointTier,
  deleteUnitPointTier,
} from "@/db/queries/unitPointTiers";

const mockDb = {
  select: vi.fn(),
  execute: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDb).mockResolvedValue(mockDb as never);
});

describe("unitPointTierQueries", () => {
  // TIER-01: upsertUnitPointTier inserts tier row with correct unit_id/model_count/points
  describe("upsertUnitPointTier", () => {
    it("inserts a new tier row with unit_id, model_count, and points", async () => {
      mockDb.execute.mockResolvedValue({ lastInsertId: 1, rowsAffected: 1 });
      await upsertUnitPointTier({ unit_id: 1, model_count: 5, points: 80 });
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE INTO unit_point_tiers"),
        [1, 5, 80],
      );
    });

    it("replaces existing tier when same unit_id + model_count (UNIQUE constraint)", async () => {
      mockDb.execute.mockResolvedValue({ lastInsertId: 1, rowsAffected: 1 });
      await upsertUnitPointTier({ unit_id: 1, model_count: 5, points: 80 });
      await upsertUnitPointTier({ unit_id: 1, model_count: 5, points: 100 });
      expect(mockDb.execute).toHaveBeenCalledTimes(2);
      expect(mockDb.execute).toHaveBeenLastCalledWith(
        expect.stringContaining("INSERT OR REPLACE INTO unit_point_tiers"),
        [1, 5, 100],
      );
    });
  });

  // TIER-02: getUnitPointTiers returns rows sorted by model_count ASC
  describe("getUnitPointTiers", () => {
    it("returns all tiers for a unit sorted by model_count ASC", async () => {
      const tiers: UnitPointTier[] = [
        { id: 1, unit_id: 1, model_count: 5, points: 80, created_at: "2026-01-01" },
        { id: 2, unit_id: 1, model_count: 10, points: 160, created_at: "2026-01-01" },
      ];
      mockDb.select.mockResolvedValue(tiers);
      const result = await getUnitPointTiers(1);
      expect(result).toEqual(tiers);
      expect(mockDb.select).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY model_count ASC"),
        [1],
      );
    });

    it("returns empty array when unit has no tiers", async () => {
      mockDb.select.mockResolvedValue([]);
      const result = await getUnitPointTiers(999);
      expect(result).toEqual([]);
    });
  });

  // TIER-03: deleteUnitPointTier removes the correct row
  describe("deleteUnitPointTier", () => {
    it("deletes the tier row by id", async () => {
      mockDb.execute.mockResolvedValue({ rowsAffected: 1 });
      await deleteUnitPointTier(42);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM unit_point_tiers WHERE id = $1"),
        [42],
      );
    });
  });
});
