/**
 * Phase 46 — unitOverrides query module tests (OVRD-01..04).
 *
 * Tests the get/upsert/delete CRUD surface via a mock DB client.
 * No real SQLite connection — all calls intercepted by vi.mock.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/db/client";
import {
  getUnitOverride,
  upsertUnitOverride,
  deleteUnitOverride,
} from "@/db/queries/unitOverrides";
import type { UnitOverride } from "@/types/unitOverride";

const mockDb = {
  select: vi.fn(),
  execute: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDb).mockResolvedValue(mockDb as never);
});

describe("unitOverrideQueries", () => {
  // OVRD-01: getUnitOverride returns null when no override exists
  describe("getUnitOverride", () => {
    it("returns null when no override exists for unit_id", async () => {
      mockDb.select.mockResolvedValueOnce([]);
      const result = await getUnitOverride(99);
      expect(result).toBeNull();
      expect(mockDb.select).toHaveBeenCalledWith(
        expect.stringContaining("WHERE unit_id = $1"),
        [99],
      );
    });

    it("returns the override row when it exists", async () => {
      const override: UnitOverride = {
        id: 1,
        unit_id: 42,
        points: 150,
        move: null,
        toughness: null,
        save: null,
        wounds: null,
        leadership: null,
        objective_control: null,
        keywords: null,
        abilities: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      };
      mockDb.select.mockResolvedValueOnce([override]);
      const result = await getUnitOverride(42);
      expect(result).toEqual(override);
      expect(result?.points).toBe(150);
    });
  });

  // OVRD-02: upsertUnitOverride creates a new row (INSERT path)
  describe("upsertUnitOverride — INSERT", () => {
    it("inserts a new override row when none exists (points only)", async () => {
      mockDb.select.mockResolvedValueOnce([]); // no existing row
      mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });

      await upsertUnitOverride({
        unit_id: 10,
        points: 150,
        move: null,
        toughness: null,
        save: null,
        wounds: null,
        leadership: null,
        objective_control: null,
        keywords: null,
        abilities: null,
      });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO unit_overrides"),
        [10, 150, null, null, null, null, null, null, null, null],
      );
    });

    it("stores all stat fields during INSERT", async () => {
      mockDb.select.mockResolvedValueOnce([]);
      mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });

      await upsertUnitOverride({
        unit_id: 5,
        points: null,
        move: 6,
        toughness: 4,
        save: 3,
        wounds: 5,
        leadership: 6,
        objective_control: 2,
        keywords: null,
        abilities: null,
      });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO unit_overrides"),
        [5, null, 6, 4, 3, 5, 6, 2, null, null],
      );
    });

    it("stores keywords and abilities during INSERT", async () => {
      mockDb.select.mockResolvedValueOnce([]);
      mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });

      await upsertUnitOverride({
        unit_id: 7,
        points: null,
        move: null,
        toughness: null,
        save: null,
        wounds: null,
        leadership: null,
        objective_control: null,
        keywords: "Infantry, Imperium",
        abilities: "Oath of Moment",
      });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO unit_overrides"),
        [7, null, null, null, null, null, null, null, "Infantry, Imperium", "Oath of Moment"],
      );
    });
  });

  // OVRD-03: upsertUnitOverride updates an existing row (UPDATE path)
  describe("upsertUnitOverride — UPDATE", () => {
    it("updates an existing row when override already exists", async () => {
      mockDb.select.mockResolvedValueOnce([{ id: 3 }]); // existing row
      mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });

      await upsertUnitOverride({
        unit_id: 10,
        points: 200,
        move: null,
        toughness: null,
        save: null,
        wounds: null,
        leadership: null,
        objective_control: null,
        keywords: null,
        abilities: null,
      });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE unit_overrides"),
        [10, 200, null, null, null, null, null, null, null, null],
      );
    });

    it("passes null fields through to UPDATE (partial override)", async () => {
      mockDb.select.mockResolvedValueOnce([{ id: 5 }]);
      mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });

      await upsertUnitOverride({
        unit_id: 20,
        points: 120,
        move: null,
        toughness: null,
        save: null,
        wounds: null,
        leadership: null,
        objective_control: null,
        keywords: null,
        abilities: null,
      });

      const [, ...params] = (mockDb.execute.mock.calls[0] as [string, unknown[]])[1] as unknown[];
      // unit_id is $1, points is $2, rest are null
      expect(params[0]).toBe(120); // points
      expect(params[1]).toBeNull(); // move
    });
  });

  // OVRD-04: deleteUnitOverride removes the row
  describe("deleteUnitOverride", () => {
    it("deletes override by unit_id", async () => {
      mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });
      await deleteUnitOverride(42);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM unit_overrides WHERE unit_id = $1"),
        [42],
      );
    });

    it("does not throw when no row exists to delete (0 rows affected)", async () => {
      mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 });
      await expect(deleteUnitOverride(999)).resolves.toBeUndefined();
    });
  });
});
