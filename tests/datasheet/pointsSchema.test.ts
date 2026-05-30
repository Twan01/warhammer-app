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

// Phase 106: syncedUnitPoints tests removed — module deleted (ALI-03)
