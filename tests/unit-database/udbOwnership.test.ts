/**
 * Phase 138-03 PLAY-04 D-07/D-08: Faction-agnostic ownership query tests.
 *
 * Verifies that getOwnedCountsByUdbUnitId:
 * - Queries with no faction JOIN/WHERE (faction-agnostic)
 * - Groups by udb_unit_id
 * - Excludes rows where udb_unit_id IS NULL
 * - Returns UdbOwnershipEntry[] (same shape as faction-scoped variant)
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

import { getOwnedCountsByUdbUnitId } from "@/db/queries/unitDatabase";

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockSelect.mockReset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getOwnedCountsByUdbUnitId", () => {
  it("returns ownership entries grouped by udb_unit_id across all factions", async () => {
    const mockRows = [
      { udb_unit_id: "u1", owned_count: 2, all_statuses: "Built|Primed" },
      { udb_unit_id: "u2", owned_count: 1, all_statuses: "Completed" },
    ];
    mockSelect.mockResolvedValueOnce(mockRows);

    const result = await getOwnedCountsByUdbUnitId();
    expect(result).toEqual(mockRows);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no units have a udb_unit_id", async () => {
    mockSelect.mockResolvedValueOnce([]);
    const result = await getOwnedCountsByUdbUnitId();
    expect(result).toEqual([]);
  });

  it("SQL has GROUP BY u.udb_unit_id", async () => {
    mockSelect.mockResolvedValueOnce([]);
    await getOwnedCountsByUdbUnitId();

    const [sql] = mockSelect.mock.calls[0];
    expect(sql).toMatch(/GROUP BY u\.udb_unit_id/i);
  });

  it("SQL filters out NULL udb_unit_id (WHERE u.udb_unit_id IS NOT NULL)", async () => {
    mockSelect.mockResolvedValueOnce([]);
    await getOwnedCountsByUdbUnitId();

    const [sql] = mockSelect.mock.calls[0];
    expect(sql).toMatch(/WHERE u\.udb_unit_id IS NOT NULL/i);
  });

  it("SQL does NOT join udb_units table (no faction scope)", async () => {
    mockSelect.mockResolvedValueOnce([]);
    await getOwnedCountsByUdbUnitId();

    const [sql] = mockSelect.mock.calls[0];
    // No JOIN to udb_units (faction scoping)
    expect(sql).not.toMatch(/JOIN udb_units/i);
    // No faction_id WHERE clause
    expect(sql).not.toMatch(/faction_id/i);
  });

  it("SQL has no parameters (parameterless aggregate)", async () => {
    mockSelect.mockResolvedValueOnce([]);
    await getOwnedCountsByUdbUnitId();

    // The second argument to db.select should be undefined or an empty array
    const callArgs = mockSelect.mock.calls[0];
    expect(callArgs.length === 1 || callArgs[1] == null || (Array.isArray(callArgs[1]) && callArgs[1].length === 0)).toBe(true);
  });
});
