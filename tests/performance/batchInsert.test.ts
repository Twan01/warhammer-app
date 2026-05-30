/**
 * Phase 98 — Batch INSERT performance tests (DBH-04).
 *
 * Verifies that replace* sync functions issue a single batched INSERT
 * per chunk (multi-row VALUES) rather than one INSERT per row.
 *
 * NOTE: replace* functions use auto-commit mode (no explicit BEGIN/COMMIT)
 * because tauri-plugin-sql uses sqlx::Pool<Sqlite> — each db.execute() may
 * run on a different connection from the pool.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
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

// Phase 106: replaceSyncedUnitPoints/Tiers tests removed — module deleted (ALI-03)

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
