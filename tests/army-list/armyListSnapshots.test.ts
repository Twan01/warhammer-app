/**
 * Phase 95 â€” armyListSnapshots query tests (SNP-01..04).
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 * Follows the selectMock/executeMock pattern from armyListQueries.test.ts.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

// Mock armyLists query functions used by restoreSnapshot
const mockGetArmyListById = vi.fn();
const mockGetArmyListWithUnits = vi.fn();
const mockGetEnhancementsByList = vi.fn();

vi.mock("@/db/queries/armyLists", () => ({
  getArmyListById: (...args: unknown[]) => mockGetArmyListById(...args),
  getArmyListWithUnits: (...args: unknown[]) => mockGetArmyListWithUnits(...args),
  getEnhancementsByList: (...args: unknown[]) => mockGetEnhancementsByList(...args),
}));

// Mock exportArmyList functions used by restoreSnapshot safety snapshot
const mockFormatArmyListForExport = vi.fn();
const mockBuildJsonFormat = vi.fn();

vi.mock("@/lib/exportArmyList", () => ({
  formatArmyListForExport: (...args: unknown[]) => mockFormatArmyListForExport(...args),
  buildJsonFormat: (...args: unknown[]) => mockBuildJsonFormat(...args),
}));

import {
  getSnapshotsByList,
  createSnapshot,
  deleteSnapshot,
  restoreSnapshot,
} from "@/db/queries/armyListSnapshots";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
  mockGetArmyListById.mockReset();
  mockGetArmyListWithUnits.mockReset();
  mockGetEnhancementsByList.mockReset();
  mockFormatArmyListForExport.mockReset();
  mockBuildJsonFormat.mockReset();
});

// ---------------------------------------------------------------------------
// getSnapshotsByList
// ---------------------------------------------------------------------------

describe("getSnapshotsByList", () => {
  it("excludes snapshot_data from SELECT and orders by created_at DESC", async () => {
    selectMock.mockResolvedValueOnce([]);
    await getSnapshotsByList(5);

    expect(selectMock).toHaveBeenCalledTimes(1);
    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).not.toMatch(/snapshot_data/);
    expect(sql).toMatch(/ORDER BY created_at DESC/);
    expect(params).toEqual([5]);
  });

  it("returns rows from db.select unchanged", async () => {
    const fixture = [
      { id: 1, list_id: 5, label: "v1", total_points: 500, created_at: "2026-01-01" },
    ];
    selectMock.mockResolvedValueOnce(fixture);
    const result = await getSnapshotsByList(5);
    expect(result).toEqual(fixture);
  });
});

// ---------------------------------------------------------------------------
// createSnapshot
// ---------------------------------------------------------------------------

describe("createSnapshot", () => {
  it("inserts with correct $1-$4 params and returns lastInsertId", async () => {
    executeMock.mockResolvedValueOnce({ lastInsertId: 42, rowsAffected: 1 });

    const result = await createSnapshot({
      list_id: 3,
      label: "My Snapshot",
      snapshot_data: '{"test": true}',
      total_points: 1000,
    });

    expect(result).toBe(42);
    expect(executeMock).toHaveBeenCalledTimes(1);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO army_list_snapshots/);
    expect(params).toEqual([3, "My Snapshot", '{"test": true}', 1000]);
  });
});

// ---------------------------------------------------------------------------
// deleteSnapshot
// ---------------------------------------------------------------------------

describe("deleteSnapshot", () => {
  it("issues DELETE WHERE id = $1", async () => {
    executeMock.mockResolvedValueOnce({ rowsAffected: 1 });
    await deleteSnapshot(7);

    expect(executeMock).toHaveBeenCalledTimes(1);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/DELETE FROM army_list_snapshots WHERE id = \$1/);
    expect(params).toEqual([7]);
  });
});

// ---------------------------------------------------------------------------
// restoreSnapshot
// ---------------------------------------------------------------------------

describe("restoreSnapshot", () => {
  const snapshotJson = JSON.stringify({
    format: "hobbyforge-army-list",
    version: "1.0",
    exported_at: "2026-01-01T00:00:00.000Z",
    list: { total_points: 500, enhancement_points: 50 },
    units: [
      { name: "Intercessors", points: 200, is_warlord: false, is_ghost: false, selected_model_count: null },
      { name: "Unknown Unit", points: 150, is_warlord: true, is_ghost: false, selected_model_count: null },
    ],
    enhancements: [
      { name: "Honour Vehement", points: 15, assigned_to: "Intercessors" },
    ],
  });

  function setupRestoreMocks() {
    // 1. getSnapshotData: SELECT snapshot_data
    selectMock.mockResolvedValueOnce([{ snapshot_data: snapshotJson }]);
    // 2. Unit name lookup: SELECT id, name FROM units WHERE faction_id = $1
    selectMock.mockResolvedValueOnce([
      { id: 10, name: "Intercessors" },
      { id: 11, name: "Hellblasters" },
    ]);
    // 3. Mock current list state for safety snapshot
    mockGetArmyListById.mockResolvedValueOnce({
      id: 1, name: "Test List", faction_id: 1,
      points_limit: 1000, list_type: null, notes: null,
      detachment_id: null, detachment_name: null,
      created_at: "2026-01-01", updated_at: "2026-01-01",
    });
    mockGetArmyListWithUnits.mockResolvedValueOnce([]);
    mockGetEnhancementsByList.mockResolvedValueOnce([]);
    mockFormatArmyListForExport.mockReturnValueOnce({
      list: {}, factionName: null, sortedUnits: [],
      enhancements: [], totalPoints: 0, enhancementTotal: 0,
    });
    mockBuildJsonFormat.mockReturnValueOnce('{"safety": true}');
    // 4. Safety snapshot INSERT
    executeMock.mockResolvedValueOnce({ lastInsertId: 99, rowsAffected: 1 });
    // 5. DELETE FROM army_list_units
    executeMock.mockResolvedValueOnce({ rowsAffected: 2 });
    // 6. INSERT unit 1 (Intercessors â€” found in lookup)
    executeMock.mockResolvedValueOnce({ lastInsertId: 100, rowsAffected: 1 });
    // 7. INSERT unit 2 (Unknown Unit â€” NOT found, ghost fallback)
    executeMock.mockResolvedValueOnce({ lastInsertId: 101, rowsAffected: 1 });
    // 8. Re-fetch new unit rows (COALESCE query)
    selectMock.mockResolvedValueOnce([
      { id: 100, match_name: "" },
      { id: 101, match_name: "Unknown Unit" },
    ]);
    // 9. Re-fetch full rows for name resolution
    selectMock.mockResolvedValueOnce([
      { id: 100, unit_id: 10, ghost_unit_name: null },
      { id: 101, unit_id: null, ghost_unit_name: "Unknown Unit" },
    ]);
    // 10. INSERT enhancement
    executeMock.mockResolvedValueOnce({ lastInsertId: 200, rowsAffected: 1 });
  }

  it("calls createSnapshot (auto-save) BEFORE DELETE FROM army_list_units", async () => {
    setupRestoreMocks();
    await restoreSnapshot({ snapshot_id: 1, list_id: 1, faction_id: 1 });

    // Find the safety snapshot INSERT (first execute call) and DELETE (second)
    const executeCalls = executeMock.mock.calls.map((call) => call[0] as string);
    const safetyInsertIdx = executeCalls.findIndex((s) =>
      s.includes("INSERT INTO army_list_snapshots"),
    );
    const deleteIdx = executeCalls.findIndex((s) =>
      s.includes("DELETE FROM army_list_units"),
    );

    expect(safetyInsertIdx).toBeGreaterThanOrEqual(0);
    expect(deleteIdx).toBeGreaterThan(safetyInsertIdx);
  });

  it("auto-save label is 'Auto-save before restore'", async () => {
    setupRestoreMocks();
    await restoreSnapshot({ snapshot_id: 1, list_id: 1, faction_id: 1 });

    const safetyCall = executeMock.mock.calls.find((call) =>
      (call[0] as string).includes("INSERT INTO army_list_snapshots"),
    );
    expect(safetyCall).toBeDefined();
    expect(safetyCall![1][1]).toBe("Auto-save before restore");
  });

  it("deletes existing units from the list", async () => {
    setupRestoreMocks();
    await restoreSnapshot({ snapshot_id: 1, list_id: 1, faction_id: 1 });

    const deleteCall = executeMock.mock.calls.find((call) =>
      (call[0] as string).includes("DELETE FROM army_list_units"),
    );
    expect(deleteCall).toBeDefined();
    expect(deleteCall![1]).toEqual([1]);
  });

  it("falls back to ghost unit when unit_id lookup fails (D-12)", async () => {
    setupRestoreMocks();
    await restoreSnapshot({ snapshot_id: 1, list_id: 1, faction_id: 1 });

    // Find the two unit INSERT calls (after DELETE and safety INSERT)
    const unitInserts = executeMock.mock.calls.filter((call) =>
      (call[0] as string).includes("INSERT INTO army_list_units"),
    );
    expect(unitInserts.length).toBe(2);

    // First unit: Intercessors (found) â€” unit_id=10, ghost_unit_name=null
    expect(unitInserts[0][1][1]).toBe(10);    // unit_id
    expect(unitInserts[0][1][2]).toBeNull();   // ghost_unit_name

    // Second unit: Unknown Unit (NOT found) â€” unit_id=null, ghost_unit_name="Unknown Unit"
    expect(unitInserts[1][1][1]).toBeNull();   // unit_id
    expect(unitInserts[1][1][2]).toBe("Unknown Unit"); // ghost_unit_name
  });

  it("throws on invalid JSON in snapshot_data (T-95-01)", async () => {
    selectMock.mockResolvedValueOnce([{ snapshot_data: "not valid json{{{" }]);

    await expect(
      restoreSnapshot({ snapshot_id: 1, list_id: 1, faction_id: 1 }),
    ).rejects.toThrow("invalid JSON");
  });

  it("throws when snapshot not found", async () => {
    selectMock.mockResolvedValueOnce([]);

    await expect(
      restoreSnapshot({ snapshot_id: 999, list_id: 1, faction_id: 1 }),
    ).rejects.toThrow("not found");
  });
});
