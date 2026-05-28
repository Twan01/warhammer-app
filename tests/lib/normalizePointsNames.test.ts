/**
 * Tests for normalizePointsNames — the post-sync name normalization that
 * resolves BSData/Wahapedia naming differences (singular/plural, case, etc.).
 */
import { describe, it, expect, vi } from "vitest";

// Mock Database type
interface MockDb {
  select: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
}

import { normalizePointsNames } from "@/lib/normalizePointsNames";

function createMockDb(
  unmatchedPoints: Array<{ id: number; datasheet_name: string; faction_id: string | null }>,
  allDatasheets: Array<{ name: string; faction_id: string | null }>,
): MockDb {
  const selectMock = vi.fn();
  // First call: unmatched points query
  selectMock.mockResolvedValueOnce(unmatchedPoints);
  // Second call: all datasheets query (only called if unmatched > 0)
  if (unmatchedPoints.length > 0) {
    selectMock.mockResolvedValueOnce(allDatasheets);
  }

  return {
    select: selectMock,
    execute: vi.fn().mockResolvedValue(undefined),
  };
}

describe("normalizePointsNames", () => {
  it("returns 0 when no points are unmatched", async () => {
    const db = createMockDb([], []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result).toBe(0);
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("fixes singular-to-plural mismatch (Canoptek Spyder to Canoptek Spyders)", async () => {
    const db = createMockDb(
      [{ id: 1, datasheet_name: "Canoptek Spyder", faction_id: "NEC" }],
      [{ name: "Canoptek Spyders", faction_id: "NEC" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result).toBe(1);
    expect(db.execute).toHaveBeenCalledWith(
      "UPDATE rw_datasheet_points SET datasheet_name = $1 WHERE id = $2",
      ["Canoptek Spyders", 1],
    );
  });

  it("fixes case-insensitive mismatch (The vs the)", async () => {
    const db = createMockDb(
      [{ id: 2, datasheet_name: "Imotekh The Stormlord", faction_id: "NEC" }],
      [{ name: "Imotekh the Stormlord", faction_id: "NEC" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result).toBe(1);
    expect(db.execute).toHaveBeenCalledWith(
      "UPDATE rw_datasheet_points SET datasheet_name = $1 WHERE id = $2",
      ["Imotekh the Stormlord", 2],
    );
  });

  it("fixes BSData singular when Wahapedia uses plural (Biovore to Biovores)", async () => {
    const db = createMockDb(
      [{ id: 3, datasheet_name: "Biovore", faction_id: "TYR" }],
      [{ name: "Biovores", faction_id: "TYR" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result).toBe(1);
    expect(db.execute).toHaveBeenCalledWith(
      "UPDATE rw_datasheet_points SET datasheet_name = $1 WHERE id = $2",
      ["Biovores", 3],
    );
  });

  it("does not update when no close match exists", async () => {
    const db = createMockDb(
      [{ id: 4, datasheet_name: "Totally Unknown Unit", faction_id: "NEC" }],
      [{ name: "Canoptek Spyders", faction_id: "NEC" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result).toBe(0);
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("only matches within the same faction", async () => {
    const db = createMockDb(
      [{ id: 5, datasheet_name: "Canoptek Spyder", faction_id: "NEC" }],
      [
        { name: "Canoptek Spyders", faction_id: "SM" }, // Wrong faction
      ],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result).toBe(0);
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("handles multiple fixes in one pass", async () => {
    const db = createMockDb(
      [
        { id: 1, datasheet_name: "Canoptek Spyder", faction_id: "NEC" },
        { id: 2, datasheet_name: "Biovore", faction_id: "TYR" },
      ],
      [
        { name: "Canoptek Spyders", faction_id: "NEC" },
        { name: "Biovores", faction_id: "TYR" },
      ],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result).toBe(2);
    expect(db.execute).toHaveBeenCalledTimes(2);
  });

  it("handles apostrophe differences via normalization (curly vs straight)", async () => {
    // Use explicit Unicode chars: ’ (right single quotation mark) vs ' (apostrophe)
    const db = createMockDb(
      [{ id: 6, datasheet_name: "T’au Empire", faction_id: "TAU" }],
      [{ name: "T'au Empire", faction_id: "TAU" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result).toBe(1);
    expect(db.execute).toHaveBeenCalledWith(
      "UPDATE rw_datasheet_points SET datasheet_name = $1 WHERE id = $2",
      ["T'au Empire", 6],
    );
  });

  it("silently skips rows that cause UNIQUE constraint violations", async () => {
    const db = createMockDb(
      [{ id: 7, datasheet_name: "Canoptek Spyder", faction_id: "NEC" }],
      [{ name: "Canoptek Spyders", faction_id: "NEC" }],
    );
    db.execute.mockRejectedValueOnce(new Error("UNIQUE constraint failed"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result).toBe(0);
  });
});
