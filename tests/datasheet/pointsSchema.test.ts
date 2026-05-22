/**
 * Phase 65 — Points schema contract tests (PI-01).
 *
 * Validates that query modules produce SQL matching expected table shapes.
 * Mocks @/db/client following the syncErrorQueries.test.ts pattern.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import {
  insertPointsImportHistory,
  getLatestPointsImportHistory,
} from "@/db/queries/pointsImportHistory";
import {
  replaceSyncedUnitPoints,
  getSyncedUnitPointsMap,
} from "@/db/queries/syncedUnitPoints";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("pointsImportHistory schema contract", () => {
  it("insertPointsImportHistory writes row with 6 data columns", async () => {
    executeMock.mockResolvedValue(undefined);
    await insertPointsImportHistory({
      source_file: "Datasheets_points.csv",
      version: "2026-05-13",
      row_count: 450,
      delta_added: 10,
      delta_removed: 2,
      delta_changed: 15,
    });
    expect(executeMock).toHaveBeenCalledOnce();
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toContain("INSERT INTO points_import_history");
    expect(sql).toContain("source_file");
    expect(sql).toContain("version");
    expect(sql).toContain("row_count");
    expect(sql).toContain("delta_added");
    expect(sql).toContain("delta_removed");
    expect(sql).toContain("delta_changed");
    expect(params).toEqual(["Datasheets_points.csv", "2026-05-13", 450, 10, 2, 15]);
  });

  it("getLatestPointsImportHistory reads most recent row", async () => {
    selectMock.mockResolvedValue([
      {
        id: 3,
        imported_at: "2026-05-13T12:00:00Z",
        source_file: "points.csv",
        version: "v1",
        row_count: 100,
        delta_added: 5,
        delta_removed: 1,
        delta_changed: 3,
      },
    ]);
    const result = await getLatestPointsImportHistory();
    expect(selectMock).toHaveBeenCalledOnce();
    const [sql] = selectMock.mock.calls[0];
    expect(sql).toContain("points_import_history");
    expect(sql).toContain("ORDER BY");
    expect(sql).toContain("LIMIT 1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe(3);
  });
});

describe("syncedUnitPoints schema contract", () => {
  it("replaceSyncedUnitPoints DELETEs then INSERTs rows (batched — DBH-04)", async () => {
    executeMock.mockResolvedValue(undefined);
    await replaceSyncedUnitPoints(
      [
        { unit_name: "Intercessors", faction_id: "SM", points: 80 },
        { unit_name: "Boyz", faction_id: null, points: 70 },
      ],
      "2026-05-13T12:00:00Z",
    );
    // BEGIN + DELETE + 1 batched INSERT (2 rows in one VALUES clause) + COMMIT = 4 calls (not 5)
    expect(executeMock).toHaveBeenCalledTimes(4);
    const [beginSql] = executeMock.mock.calls[0];
    expect(beginSql).toContain("BEGIN TRANSACTION");
    const [deleteSql] = executeMock.mock.calls[1];
    expect(deleteSql).toContain("DELETE FROM synced_unit_points");
    const [insertSql, params] = executeMock.mock.calls[2];
    expect(insertSql).toContain("INSERT INTO synced_unit_points");
    expect(insertSql).toContain("unit_name");
    expect(insertSql).toContain("faction_id");
    expect(insertSql).toContain("points");
    expect(insertSql).toContain("synced_at");
    // Both rows in a single multi-row VALUES clause
    expect(insertSql).toMatch(/VALUES.*\$1.*\$5/s);
    expect(params).toEqual(["Intercessors", "SM", 80, "2026-05-13T12:00:00Z", "Boyz", null, 70, "2026-05-13T12:00:00Z"]);
    const [commitSql] = executeMock.mock.calls[3];
    expect(commitSql).toContain("COMMIT");
  });

  it("getSyncedUnitPointsMap returns Map keyed by unit_name:faction_id", async () => {
    selectMock.mockResolvedValue([
      { unit_name: "Intercessors", faction_id: "SM", points: 80 },
      { unit_name: "Boyz", faction_id: null, points: 70 },
    ]);
    const result = await getSyncedUnitPointsMap();
    expect(selectMock).toHaveBeenCalledOnce();
    const [sql] = selectMock.mock.calls[0];
    expect(sql).toContain("synced_unit_points");
    expect(result).toBeInstanceOf(Map);
    expect(result.get("Intercessors:SM")).toBe(80);
    expect(result.get("Boyz:null")).toBe(70);
  });
});
