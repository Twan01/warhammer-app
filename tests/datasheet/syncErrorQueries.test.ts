/**
 * Phase 44 — syncErrors query module tests (SYNC-04).
 *
 * Mocks @/db/client (hobbyforge.db) following the datasheetQueries.test.ts pattern.
 * sync_errors lives in hobbyforge.db, NOT rules.db.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import { insertSyncError, getSyncErrors } from "@/db/queries/syncErrors";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("syncErrors queries", () => {
  it("SYNC-04: insertSyncError writes a row with all 4 fields", async () => {
    executeMock.mockResolvedValue(undefined);
    await insertSyncError({
      occurred_at: "2026-05-08T12:00:00.000Z",
      error_type: "validation_error",
      message: "Factions.csv: missing required columns: name",
      csv_file: "Factions.csv",
    });
    expect(executeMock).toHaveBeenCalledOnce();
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toContain("INSERT INTO sync_errors");
    expect(sql).toContain("$1, $2, $3, $4");
    expect(params).toEqual([
      "2026-05-08T12:00:00.000Z",
      "validation_error",
      "Factions.csv: missing required columns: name",
      "Factions.csv",
    ]);
  });

  it("SYNC-04: insertSyncError passes null for csv_file when omitted", async () => {
    executeMock.mockResolvedValue(undefined);
    await insertSyncError({
      occurred_at: "2026-05-08T12:00:00.000Z",
      error_type: "sync_error",
      message: "commit: database is locked",
    });
    const [, params] = executeMock.mock.calls[0];
    expect(params[3]).toBeNull();
  });

  it("SYNC-04: getSyncErrors returns rows ordered by occurred_at DESC", async () => {
    selectMock.mockResolvedValue([
      { id: 2, occurred_at: "2026-05-08T13:00:00Z", error_type: "sync_error", message: "commit fail", csv_file: null },
      { id: 1, occurred_at: "2026-05-08T12:00:00Z", error_type: "fetch_failed", message: "HTTP 500", csv_file: "Factions.csv" },
    ]);
    const result = await getSyncErrors();
    expect(selectMock).toHaveBeenCalledOnce();
    const [sql] = selectMock.mock.calls[0];
    expect(sql).toContain("ORDER BY occurred_at DESC");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(2);
  });
});
