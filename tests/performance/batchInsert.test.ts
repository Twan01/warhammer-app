/**
 * Phase 98 — Batch INSERT performance tests (DBH-04).
 *
 * Verifies that replace* sync functions issue a single batched INSERT
 * per chunk (multi-row VALUES) rather than one INSERT per row.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  replaceSyncedUnitPoints,
  replaceSyncedUnitPointTiers,
} from "@/db/queries/syncedUnitPoints";
import { replaceSyncedEnhancements } from "@/db/queries/bsdataExtended";

const executeMock = vi.fn().mockResolvedValue({ lastInsertId: 0 });

vi.mock("@/db/client", () => ({
  getDb: async () => ({
    execute: executeMock,
    select: vi.fn().mockResolvedValue([]),
  }),
}));

beforeEach(() => {
  executeMock.mockClear();
});

// ---------------------------------------------------------------------------
// replaceSyncedUnitPoints
// ---------------------------------------------------------------------------
describe("replaceSyncedUnitPoints", () => {
  it("inserts 2 rows with 1 SQL call, not 2 calls", async () => {
    const rows = [
      { unit_name: "Space Marines", faction_id: "SM", points: 100 },
      { unit_name: "Dark Angels", faction_id: "DA", points: 120 },
    ];
    await replaceSyncedUnitPoints(rows, "2026-05-22T00:00:00Z");

    // Calls: BEGIN + DELETE + 1 batched INSERT + COMMIT = 4 total
    const insertCalls = executeMock.mock.calls.filter((call: unknown[]) =>
      (call[0] as string).includes("INSERT INTO synced_unit_points"),
    );
    expect(insertCalls).toHaveLength(1);

    const [sql, params] = insertCalls[0];
    expect(sql).toMatch(/VALUES \(\$1, \$2, \$3, \$4\), \(\$5, \$6, \$7, \$8\)/);
    expect(params).toHaveLength(8); // 2 rows × 4 columns
  });

  it("produces 0 INSERT calls for an empty array", async () => {
    await replaceSyncedUnitPoints([], "2026-05-22T00:00:00Z");

    const insertCalls = executeMock.mock.calls.filter((call: unknown[]) =>
      (call[0] as string).includes("INSERT INTO synced_unit_points"),
    );
    expect(insertCalls).toHaveLength(0);

    // Should still have: BEGIN + DELETE + COMMIT
    const allSqls = executeMock.mock.calls.map((call: unknown[]) => call[0] as string);
    expect(allSqls).toContain("BEGIN TRANSACTION");
    expect(allSqls).toContain("DELETE FROM synced_unit_points");
    expect(allSqls).toContain("COMMIT");
  });

  it("produces 2 INSERT calls for 201 rows (200-row chunk boundary)", async () => {
    const rows = Array.from({ length: 201 }, (_, i) => ({
      unit_name: `Unit ${i}`,
      faction_id: "SM",
      points: i * 10,
    }));
    await replaceSyncedUnitPoints(rows, "2026-05-22T00:00:00Z");

    const insertCalls = executeMock.mock.calls.filter((call: unknown[]) =>
      (call[0] as string).includes("INSERT INTO synced_unit_points"),
    );
    expect(insertCalls).toHaveLength(2);

    // First batch: 200 rows → 200 × 4 = 800 params
    expect(insertCalls[0][1]).toHaveLength(800);
    // Second batch: 1 row → 1 × 4 = 4 params
    expect(insertCalls[1][1]).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// replaceSyncedUnitPointTiers
// ---------------------------------------------------------------------------
describe("replaceSyncedUnitPointTiers", () => {
  it("inserts 2 rows with 1 SQL call using COL_COUNT=5", async () => {
    const rows = [
      { unit_name: "Space Marines", faction_id: "SM", model_count: 5, points: 100 },
      { unit_name: "Dark Angels", faction_id: "DA", model_count: 10, points: 200 },
    ];
    await replaceSyncedUnitPointTiers(rows, "2026-05-22T00:00:00Z");

    const insertCalls = executeMock.mock.calls.filter((call: unknown[]) =>
      (call[0] as string).includes("INSERT INTO synced_unit_point_tiers"),
    );
    expect(insertCalls).toHaveLength(1);

    const [sql, params] = insertCalls[0];
    expect(sql).toMatch(/VALUES \(\$1, \$2, \$3, \$4, \$5\), \(\$6, \$7, \$8, \$9, \$10\)/);
    expect(params).toHaveLength(10); // 2 rows × 5 columns
  });

  it("produces 0 INSERT calls for an empty array", async () => {
    await replaceSyncedUnitPointTiers([], "2026-05-22T00:00:00Z");

    const insertCalls = executeMock.mock.calls.filter((call: unknown[]) =>
      (call[0] as string).includes("INSERT INTO synced_unit_point_tiers"),
    );
    expect(insertCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// replaceSyncedEnhancements (bsdataExtended representative)
// ---------------------------------------------------------------------------
describe("replaceSyncedEnhancements", () => {
  it("inserts 2 rows with 1 SQL call using COL_COUNT=5", async () => {
    const rows = [
      { name: "Veil of Time", faction_id: "TS", detachment_name: "Cult Arcanum", points: 20 },
      { name: "Raiment of War", faction_id: "BA", detachment_name: "Sons of Sanguinius", points: 15 },
    ];
    await replaceSyncedEnhancements(rows, "2026-05-22T00:00:00Z");

    const insertCalls = executeMock.mock.calls.filter((call: unknown[]) =>
      (call[0] as string).includes("INSERT INTO synced_enhancements"),
    );
    expect(insertCalls).toHaveLength(1);

    const [sql, params] = insertCalls[0];
    expect(sql).toMatch(/VALUES \(\$1, \$2, \$3, \$4, \$5\), \(\$6, \$7, \$8, \$9, \$10\)/);
    expect(params).toHaveLength(10); // 2 rows × 5 columns
  });

  it("produces 0 INSERT calls for an empty array", async () => {
    await replaceSyncedEnhancements([], "2026-05-22T00:00:00Z");

    const insertCalls = executeMock.mock.calls.filter((call: unknown[]) =>
      (call[0] as string).includes("INSERT INTO synced_enhancements"),
    );
    expect(insertCalls).toHaveLength(0);
  });
});
