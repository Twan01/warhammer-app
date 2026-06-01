/**
 * Phase 111 — FR-03: locale-aware query layer tests.
 *
 * Verifies that query functions use COALESCE SQL when locale='fr',
 * and plain column names when locale='en' or omitted.
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
  searchUdbUnits,
} from "@/db/queries/unitDatabase";

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockSelect.mockReset();
});

// ---------------------------------------------------------------------------
// getUdbFactions — locale-aware
// ---------------------------------------------------------------------------

describe("getUdbFactions", () => {
  it("with locale='fr' uses COALESCE in SQL", async () => {
    mockSelect.mockResolvedValue([]);
    await getUdbFactions("fr");
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("COALESCE"),
    );
  });

  it("with locale='en' uses plain name column (no COALESCE)", async () => {
    mockSelect.mockResolvedValue([]);
    await getUdbFactions("en");
    const sql: string = mockSelect.mock.calls[0][0];
    expect(sql).not.toContain("COALESCE");
  });

  it("without locale parameter uses plain name column", async () => {
    mockSelect.mockResolvedValue([]);
    await getUdbFactions();
    const sql: string = mockSelect.mock.calls[0][0];
    expect(sql).not.toContain("COALESCE");
  });
});

// ---------------------------------------------------------------------------
// getUdbUnitsByFaction — locale-aware
// ---------------------------------------------------------------------------

describe("getUdbUnitsByFaction", () => {
  it("with locale='fr' uses COALESCE for unit name", async () => {
    mockSelect.mockResolvedValue([]);
    await getUdbUnitsByFaction("SM", "fr");
    const sql: string = mockSelect.mock.calls[0][0];
    expect(sql).toContain("COALESCE");
    expect(sql).toContain("name_fr");
  });

  it("without locale uses plain u.name column", async () => {
    mockSelect.mockResolvedValue([]);
    await getUdbUnitsByFaction("SM");
    const sql: string = mockSelect.mock.calls[0][0];
    expect(sql).not.toContain("COALESCE");
  });
});

// ---------------------------------------------------------------------------
// getUdbUnitDetail — locale-aware with multiple COALESCE points
// ---------------------------------------------------------------------------

describe("getUdbUnitDetail", () => {
  it("with locale='fr' applies COALESCE to unit, abilities, and weapons", async () => {
    // First call: unit row (not found → null)
    mockSelect
      .mockResolvedValueOnce([
        {
          id: "u1",
          faction_id: "SM",
          name: "Captain",
          role: "Character",
          base_points: 80,
          damaged_w: null,
          damaged_desc: null,
        },
      ])
      .mockResolvedValueOnce([]) // models
      .mockResolvedValueOnce([]) // weapons
      .mockResolvedValueOnce([]) // abilities
      .mockResolvedValueOnce([]) // keywords
      .mockResolvedValueOnce([]) // points
      .mockResolvedValueOnce([]); // composition

    await getUdbUnitDetail("u1", "fr");

    // All SQL calls combined should include COALESCE (unit name, abilities, weapons)
    const allSql = mockSelect.mock.calls.map((c) => c[0] as string).join("\n");
    expect(allSql).toContain("COALESCE");
    expect(allSql).toContain("name_fr");
  });

  it("without locale uses plain column names", async () => {
    mockSelect
      .mockResolvedValueOnce([
        {
          id: "u1",
          faction_id: "SM",
          name: "Captain",
          role: "Character",
          base_points: 80,
          damaged_w: null,
          damaged_desc: null,
        },
      ])
      .mockResolvedValueOnce([]) // models
      .mockResolvedValueOnce([]) // weapons
      .mockResolvedValueOnce([]) // abilities
      .mockResolvedValueOnce([]) // keywords
      .mockResolvedValueOnce([]) // points
      .mockResolvedValueOnce([]); // composition

    await getUdbUnitDetail("u1");

    const allSql = mockSelect.mock.calls.map((c) => c[0] as string).join("\n");
    expect(allSql).not.toContain("COALESCE");
  });

  it("returns null when unit does not exist", async () => {
    mockSelect.mockResolvedValue([]);
    const result = await getUdbUnitDetail("nonexistent", "fr");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// searchUdbUnits — does NOT accept locale parameter (FTS5 bilingual by index)
// ---------------------------------------------------------------------------

describe("searchUdbUnits", () => {
  it("does NOT have a locale parameter — accepts only query string", async () => {
    // Type-level: searchUdbUnits signature is (query: string) => Promise<UdbSearchResult[]>
    // At runtime, calling with only a string works correctly
    mockSelect.mockResolvedValue([]);
    await searchUdbUnits("space marine");
    // Verify no COALESCE in search SQL (FTS5 handles bilingual natively)
    const sql: string = mockSelect.mock.calls[0][0];
    expect(sql).toContain("MATCH");
    expect(sql).not.toContain("COALESCE");
  });
});
