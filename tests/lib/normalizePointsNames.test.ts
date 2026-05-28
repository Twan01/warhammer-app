import { describe, it, expect, vi } from "vitest";
import { normalizePointsNames } from "@/lib/normalizePointsNames";

interface MockDb {
  select: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
}

function createMockDb(
  unmatchedPoints: Array<{ id: number; datasheet_name: string; faction_id: string | null }>,
  allDatasheets: Array<{ name: string; faction_id: string | null }>,
): MockDb {
  const selectMock = vi.fn();
  selectMock.mockResolvedValueOnce(unmatchedPoints);
  if (unmatchedPoints.length > 0) {
    selectMock.mockResolvedValueOnce(allDatasheets);
  }

  return {
    select: selectMock,
    execute: vi.fn().mockResolvedValue(undefined),
  };
}

describe("normalizePointsNames", () => {
  it("returns empty result when no points are unmatched", async () => {
    const db = createMockDb([], []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result).toEqual({ updated: 0, unmatched: [] });
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(db.execute).not.toHaveBeenCalled();
  });

  // ── Strategy 1: case-insensitive exact ──

  it("fixes case-insensitive mismatch (The vs the)", async () => {
    const db = createMockDb(
      [{ id: 2, datasheet_name: "Imotekh The Stormlord", faction_id: "NEC" }],
      [{ name: "Imotekh the Stormlord", faction_id: "NEC" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result.updated).toBe(1);
    expect(db.execute).toHaveBeenCalledWith(
      "UPDATE rw_datasheet_points SET datasheet_name = $1 WHERE id = $2",
      ["Imotekh the Stormlord", 2],
    );
  });

  // ── Strategy 2: normalized match (plurals, apostrophes, hyphens) ──

  it("fixes singular-to-plural mismatch (Canoptek Spyder → Canoptek Spyders)", async () => {
    const db = createMockDb(
      [{ id: 1, datasheet_name: "Canoptek Spyder", faction_id: "NEC" }],
      [{ name: "Canoptek Spyders", faction_id: "NEC" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result.updated).toBe(1);
    expect(db.execute).toHaveBeenCalledWith(
      "UPDATE rw_datasheet_points SET datasheet_name = $1 WHERE id = $2",
      ["Canoptek Spyders", 1],
    );
  });

  it("fixes -ies/-y plural (Batteries → Battery)", async () => {
    const db = createMockDb(
      [{ id: 10, datasheet_name: "Thunderfire Batteries", faction_id: "SM" }],
      [{ name: "Thunderfire Battery", faction_id: "SM" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result.updated).toBe(1);
    expect(db.execute).toHaveBeenCalledWith(
      "UPDATE rw_datasheet_points SET datasheet_name = $1 WHERE id = $2",
      ["Thunderfire Battery", 10],
    );
  });

  it("fixes -ches plural (Witches → Witch)", async () => {
    const db = createMockDb(
      [{ id: 11, datasheet_name: "Cultist Witches", faction_id: "CSM" }],
      [{ name: "Cultist Witch", faction_id: "CSM" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result.updated).toBe(1);
  });

  it("fixes -ves/-f plural (Wolves → Wolf)", async () => {
    const db = createMockDb(
      [{ id: 12, datasheet_name: "Fenrisian Wolves", faction_id: "SM" }],
      [{ name: "Fenrisian Wolf", faction_id: "SM" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result.updated).toBe(1);
  });

  it("does not over-singularize exception words like Chaos", async () => {
    const db = createMockDb(
      [{ id: 13, datasheet_name: "Chaos Spawn", faction_id: "CSM" }],
      [{ name: "Chaos Spawns", faction_id: "CSM" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result.updated).toBe(1);
    // "Chaos" should not lose its 's'; matching works because only the last word is singularized
  });

  it("normalizes hyphens to spaces (Doom-Scythe → Doom Scythe)", async () => {
    const db = createMockDb(
      [{ id: 14, datasheet_name: "Doom-Scythe", faction_id: "NEC" }],
      [{ name: "Doom Scythe", faction_id: "NEC" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result.updated).toBe(1);
  });

  it("handles apostrophe differences (curly vs straight)", async () => {
    const db = createMockDb(
      [{ id: 6, datasheet_name: "T’au Empire", faction_id: "TAU" }],
      [{ name: "T'au Empire", faction_id: "TAU" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result.updated).toBe(1);
  });

  // ── Strategy 3: prefix match ──

  it("matches by prefix when names share a long enough root", async () => {
    const db = createMockDb(
      [{ id: 15, datasheet_name: "Canoptek Doomstalker Unit", faction_id: "NEC" }],
      [{ name: "Canoptek Doomstalker", faction_id: "NEC" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result.updated).toBe(1);
  });

  // ── Strategy 4: Levenshtein ──

  it("matches via Levenshtein for 1-char typo in long name", async () => {
    const db = createMockDb(
      [{ id: 16, datasheet_name: "Canoptek Doomstaker", faction_id: "NEC" }],
      [{ name: "Canoptek Doomstalker", faction_id: "NEC" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    // After normalization both become "canoptek doomstaker" vs "canoptek doomstalker"
    // Levenshtein = 1, length = 20, ratio = 5% → accepted
    expect(result.updated).toBe(1);
  });

  it("rejects Levenshtein match when candidates tie", async () => {
    const db = createMockDb(
      [{ id: 17, datasheet_name: "Canoptek Domstalker", faction_id: "NEC" }],
      [
        { name: "Canoptek Doomstalker", faction_id: "NEC" },
        { name: "Canoptek Domstalder", faction_id: "NEC" },
      ],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    // Both are distance 1 after normalization → tie → no match
    expect(result.updated).toBe(0);
    expect(result.unmatched).toHaveLength(1);
  });

  // ── Faction scoping ──

  it("only matches within the same faction", async () => {
    const db = createMockDb(
      [{ id: 5, datasheet_name: "Canoptek Spyder", faction_id: "NEC" }],
      [{ name: "Canoptek Spyders", faction_id: "SM" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result.updated).toBe(0);
    expect(result.unmatched).toHaveLength(1);
  });

  // ── Multiple fixes ──

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
    expect(result.updated).toBe(2);
    expect(db.execute).toHaveBeenCalledTimes(2);
  });

  // ── No match ──

  it("reports unmatched when no close match exists", async () => {
    const db = createMockDb(
      [{ id: 4, datasheet_name: "Totally Unknown Unit", faction_id: "NEC" }],
      [{ name: "Canoptek Spyders", faction_id: "NEC" }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result.updated).toBe(0);
    expect(result.unmatched).toEqual([
      { datasheet_name: "Totally Unknown Unit", faction_id: "NEC" },
    ]);
  });

  // ── Error handling ──

  it("silently skips rows that cause UNIQUE constraint violations", async () => {
    const db = createMockDb(
      [{ id: 7, datasheet_name: "Canoptek Spyder", faction_id: "NEC" }],
      [{ name: "Canoptek Spyders", faction_id: "NEC" }],
    );
    db.execute.mockRejectedValueOnce(new Error("UNIQUE constraint failed"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await normalizePointsNames(db as any);
    expect(result.updated).toBe(0);
    expect(result.unmatched).toHaveLength(1);
  });
});
