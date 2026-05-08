/**
 * Phase 45 — rulesSnapshot query module tests (META-06).
 *
 * Mocks both @/db/client (hobbyforge.db) and @/db/rules-client (rules.db)
 * following the syncErrorQueries.test.ts pattern.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const hobbySelectMock = vi.fn();
const hobbyExecuteMock = vi.fn();

const rulesSelectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: hobbySelectMock, execute: hobbyExecuteMock }),
}));

vi.mock("@/db/rules-client", () => ({
  getRulesDb: async () => ({ select: rulesSelectMock }),
}));

import {
  capturePreSyncSnapshot,
  cleanOldSnapshots,
  getLatestSnapshot,
} from "@/db/queries/rulesSnapshot";

beforeEach(() => {
  hobbySelectMock.mockReset();
  hobbyExecuteMock.mockReset();
  rulesSelectMock.mockReset();
});

describe("rulesSnapshot — capturePreSyncSnapshot", () => {
  it("META-06: calls getRulesDb().select for each of the 11 SNAPSHOT_TABLES entries", async () => {
    // For tables with query: supply [{id, name}] rows; for null query supply [{cnt}]
    rulesSelectMock.mockImplementation((sql: string) => {
      if (sql.includes("COUNT(*)")) return Promise.resolve([{ cnt: 5 }]);
      return Promise.resolve([{ id: "001", name: "Alpha" }]);
    });
    hobbyExecuteMock.mockResolvedValue(undefined);
    // cleanOldSnapshots: first select returns < keepCount entries so returns early
    hobbySelectMock.mockResolvedValue([]);

    await capturePreSyncSnapshot("v1.0");

    // 7 tables have a real query (SELECT id, name), 4 have null (COUNT)
    // Total rulesDb select calls = 11
    expect(rulesSelectMock).toHaveBeenCalledTimes(11);
  });

  it("META-06: calls getDb().execute 11 times with INSERT INTO rules_snapshot", async () => {
    rulesSelectMock.mockImplementation((sql: string) => {
      if (sql.includes("COUNT(*)")) return Promise.resolve([{ cnt: 3 }]);
      return Promise.resolve([]);
    });
    hobbyExecuteMock.mockResolvedValue(undefined);
    hobbySelectMock.mockResolvedValue([]);

    await capturePreSyncSnapshot(null);

    // 11 INSERT calls (one per table)
    const insertCalls = hobbyExecuteMock.mock.calls.filter((c: unknown[]) =>
      (c[0] as string).includes("INSERT INTO rules_snapshot"),
    );
    expect(insertCalls).toHaveLength(11);
  });

  it("META-06: passes wahapediaVersion to each INSERT", async () => {
    rulesSelectMock.mockImplementation((sql: string) => {
      if (sql.includes("COUNT(*)")) return Promise.resolve([{ cnt: 0 }]);
      return Promise.resolve([]);
    });
    hobbyExecuteMock.mockResolvedValue(undefined);
    hobbySelectMock.mockResolvedValue([]);

    await capturePreSyncSnapshot("v2.5");

    const insertCalls = hobbyExecuteMock.mock.calls.filter((c: unknown[]) =>
      (c[0] as string).includes("INSERT INTO rules_snapshot"),
    );
    for (const [, params] of insertCalls) {
      expect(params[1]).toBe("v2.5");
    }
  });

  it("META-06: uses COUNT(*) for composite-PK tables (query: null), SELECT id,name for simple-PK tables", async () => {
    rulesSelectMock.mockImplementation((sql: string) => {
      if (sql.includes("COUNT(*)")) return Promise.resolve([{ cnt: 42 }]);
      return Promise.resolve([{ id: "x", name: "y" }]);
    });
    hobbyExecuteMock.mockResolvedValue(undefined);
    hobbySelectMock.mockResolvedValue([]);

    await capturePreSyncSnapshot(null);

    const countCalls = rulesSelectMock.mock.calls.filter((c: unknown[]) =>
      (c[0] as string).includes("COUNT(*)"),
    );
    const nameCalls = rulesSelectMock.mock.calls.filter((c: unknown[]) =>
      (c[0] as string).includes("SELECT id, name"),
    );
    // 4 composite-PK tables: models, abilities (datasheet), keywords, wargear
    expect(countCalls).toHaveLength(4);
    // 7 simple-PK tables
    expect(nameCalls).toHaveLength(7);
  });

  it("META-06: calls cleanOldSnapshots (hobbyDb.select for DISTINCT captured_at) after writing", async () => {
    rulesSelectMock.mockImplementation((sql: string) => {
      if (sql.includes("COUNT(*)")) return Promise.resolve([{ cnt: 0 }]);
      return Promise.resolve([]);
    });
    hobbyExecuteMock.mockResolvedValue(undefined);
    // Return fewer than keepCount entries so DELETE is not called
    hobbySelectMock.mockResolvedValue([{ captured_at: "2026-01-01T00:00:00.000Z" }]);

    await capturePreSyncSnapshot(null);

    // hobbySelectMock should have been called for DISTINCT captured_at
    expect(hobbySelectMock).toHaveBeenCalledOnce();
    const [sql] = hobbySelectMock.mock.calls[0];
    expect(sql).toContain("DISTINCT captured_at");
  });
});

describe("rulesSnapshot — cleanOldSnapshots", () => {
  it("META-06: deletes nothing when fewer than keepCount groups exist", async () => {
    hobbySelectMock.mockResolvedValue([
      { captured_at: "2026-01-02T00:00:00.000Z" },
      { captured_at: "2026-01-01T00:00:00.000Z" },
    ]);
    hobbyExecuteMock.mockResolvedValue(undefined);

    await cleanOldSnapshots(3);

    // Only 2 rows returned (< 3 keepCount) — no DELETE
    expect(hobbyExecuteMock).not.toHaveBeenCalled();
  });

  it("META-06: deletes rows with captured_at < oldestKept when 4+ groups exist", async () => {
    hobbySelectMock.mockResolvedValue([
      { captured_at: "2026-01-04T00:00:00.000Z" },
      { captured_at: "2026-01-03T00:00:00.000Z" },
      { captured_at: "2026-01-02T00:00:00.000Z" },
    ]);
    hobbyExecuteMock.mockResolvedValue(undefined);

    await cleanOldSnapshots(3);

    expect(hobbyExecuteMock).toHaveBeenCalledOnce();
    const [sql, params] = hobbyExecuteMock.mock.calls[0];
    expect(sql).toContain("DELETE FROM rules_snapshot WHERE captured_at < $1");
    expect(params[0]).toBe("2026-01-02T00:00:00.000Z");
  });
});

describe("rulesSnapshot — getLatestSnapshot", () => {
  it("META-06: returns rows from hobbyforge.db using MAX(captured_at) subquery", async () => {
    const mockRows = [
      { id: 1, captured_at: "2026-05-08T10:00:00.000Z", wahapedia_version: "v1.0", table_name: "rw_factions", row_count: 20, snapshot_data: null },
    ];
    hobbySelectMock.mockResolvedValue(mockRows);

    const result = await getLatestSnapshot();

    expect(hobbySelectMock).toHaveBeenCalledOnce();
    const [sql] = hobbySelectMock.mock.calls[0];
    expect(sql).toContain("MAX(captured_at)");
    expect(result).toEqual(mockRows);
  });
});
