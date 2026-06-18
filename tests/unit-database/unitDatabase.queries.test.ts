/**
 * Phase 104 — BUI-04/13/14: unitDatabase query layer tests.
 *
 * Mocks @/db/client to verify SQL queries are constructed correctly
 * and results are returned/transformed as expected.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();
const mockDb = { select: mockSelect };

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

import {
  getUdbFactions,
  getUdbUnitsByFaction,
  getUdbUnitDetail,
  getUdbUnitsByIds,
  searchUdbUnits,
} from "@/db/queries/unitDatabase";

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockSelect.mockReset();
});

// ---------------------------------------------------------------------------
// searchUdbUnits
// ---------------------------------------------------------------------------

describe("searchUdbUnits", () => {
  it("returns empty array for query shorter than 2 chars", async () => {
    const result = await searchUdbUnits("a");
    expect(result).toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("returns empty array for single-char query after trim", async () => {
    const result = await searchUdbUnits("  b ");
    expect(result).toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("strips FTS5 special characters", async () => {
    mockSelect.mockResolvedValue([]);
    await searchUdbUnits("inter\"cess'ors");
    // The sanitized string should be "intercessors" + "*"
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("MATCH"),
      ["intercessors*"],
    );
  });

  it("appends * for prefix matching", async () => {
    mockSelect.mockResolvedValue([]);
    await searchUdbUnits("inter");
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("MATCH"),
      ["inter*"],
    );
  });

  it("calls db.select with MATCH and returns results", async () => {
    const fakeResults = [
      { unit_id: "u1", name: "Intercessors", faction_name: "Space Marines", keywords: "Infantry" },
    ];
    mockSelect.mockResolvedValue(fakeResults);
    const result = await searchUdbUnits("inter");
    expect(result).toEqual(fakeResults);
  });

  it("returns empty for query that becomes empty after sanitization", async () => {
    const result = await searchUdbUnits("\"'*^()");
    expect(result).toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getUdbFactions
// ---------------------------------------------------------------------------

describe("getUdbFactions", () => {
  it("returns all factions ordered by name", async () => {
    const fakeFactions = [
      { id: "AM", name: "Astra Militarum", short_name: null },
      { id: "SM", name: "Space Marines", short_name: null },
    ];
    mockSelect.mockResolvedValue(fakeFactions);

    const result = await getUdbFactions();
    expect(result).toEqual(fakeFactions);
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY name ASC"),
    );
  });
});

// ---------------------------------------------------------------------------
// getUdbUnitsByFaction
// ---------------------------------------------------------------------------

describe("getUdbUnitsByFaction", () => {
  it("returns units for a given faction ID", async () => {
    const fakeUnits = [
      { id: "u1", faction_id: "SM", name: "Captain", role: "Character", base_points: 80, min_models: 1, max_models: 1 },
    ];
    mockSelect.mockResolvedValue(fakeUnits);

    const result = await getUdbUnitsByFaction("SM");
    expect(result).toEqual(fakeUnits);
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("WHERE u.faction_id = $1"),
      ["SM"],
    );
  });
});

// ---------------------------------------------------------------------------
// getUdbUnitDetail
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// getUdbUnitsByIds
// ---------------------------------------------------------------------------

describe("getUdbUnitsByIds", () => {
  it("returns empty array without hitting DB when ids is empty", async () => {
    const result = await getUdbUnitsByIds([]);
    expect(result).toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("returns one UdbUnitDetail per id (batch of 2)", async () => {
    // First call: base unit rows (both units returned by IN query)
    mockSelect
      .mockResolvedValueOnce([
        { id: "u1", faction_id: "SM", name: "Captain", role: "Character", base_points: 80, damaged_w: null, damaged_desc: null },
        { id: "u2", faction_id: "SM", name: "Intercessors", role: "Battleline", base_points: 75, damaged_w: null, damaged_desc: null },
      ])
      // Sub-queries for u1 (models, weapons, abilities, keywords, points, composition)
      .mockResolvedValueOnce([{ id: 1, unit_id: "u1", line_order: 0, name: null, M: "6\"", T: 4, Sv: "3+", inv_sv: null, W: 5, Ld: "6+", OC: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      // Sub-queries for u2 (models, weapons, abilities, keywords, points, composition)
      .mockResolvedValueOnce([{ id: 2, unit_id: "u2", line_order: 0, name: null, M: "6\"", T: 4, Sv: "3+", inv_sv: null, W: 2, Ld: "6+", OC: 2 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await getUdbUnitsByIds(["u1", "u2"]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("u1");
    expect(result[0].name).toBe("Captain");
    expect(result[0].models).toHaveLength(1);
    expect(result[1].id).toBe("u2");
    expect(result[1].name).toBe("Intercessors");
  });

  it("uses positional placeholders in the IN clause for the ids", async () => {
    // Return one unit then its sub-queries
    mockSelect
      .mockResolvedValueOnce([
        { id: "u1", faction_id: "SM", name: "Captain", role: "Character", base_points: 80, damaged_w: null, damaged_desc: null },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await getUdbUnitsByIds(["u1", "u2", "u3"]);

    // The base query should contain WHERE id IN ($1, $2, $3) bound with the ids array
    const firstCall = mockSelect.mock.calls[0];
    expect(firstCall[0]).toContain("WHERE id IN ($1, $2, $3)");
    expect(firstCall[1]).toEqual(["u1", "u2", "u3"]);
  });

  it("tolerates a missing id — returns only the rows that exist (no throw)", async () => {
    // DB only returns 1 row even though 2 ids were requested
    mockSelect
      .mockResolvedValueOnce([
        { id: "u1", faction_id: "SM", name: "Captain", role: "Character", base_points: 80, damaged_w: null, damaged_desc: null },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await getUdbUnitsByIds(["u1", "nonexistent"]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("u1");
  });
});

// ---------------------------------------------------------------------------
// getUdbUnitDetail
// ---------------------------------------------------------------------------

describe("getUdbUnitDetail", () => {
  it("returns null when unit does not exist", async () => {
    mockSelect.mockResolvedValue([]);
    const result = await getUdbUnitDetail("nonexistent");
    expect(result).toBeNull();
  });

  it("returns full detail with sub-tables", async () => {
    // First call is the unit row, subsequent calls are sub-tables
    mockSelect
      .mockResolvedValueOnce([{ id: "u1", faction_id: "SM", name: "Captain", role: "Character", base_points: 80, damaged_w: null, damaged_desc: null }])
      .mockResolvedValueOnce([{ id: 1, unit_id: "u1", line_order: 0, name: null, M: "6\"", T: 4, Sv: "3+", inv_sv: "4+", W: 5, Ld: "6+", OC: 1 }]) // models
      .mockResolvedValueOnce([]) // weapons
      .mockResolvedValueOnce([]) // abilities
      .mockResolvedValueOnce([]) // keywords
      .mockResolvedValueOnce([]) // points
      .mockResolvedValueOnce([]); // composition

    const result = await getUdbUnitDetail("u1");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Captain");
    expect(result!.models).toHaveLength(1);
    expect(result!.weapons).toEqual([]);
  });
});
