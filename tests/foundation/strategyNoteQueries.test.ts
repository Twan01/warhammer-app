/**
 * STRAT-06 (Phase 6 Success Criteria 4) â€” Strategy note query function tests.
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 * Verifies SQL strings + parameter arrays.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

// Import AFTER vi.mock so the mocked client is used
import { getStrategyNote, upsertStrategyNote } from "@/db/queries/strategyNotes";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("strategyNotes queries â€” getStrategyNote", () => {
  it("returns null when no row exists for the given unit_id", async () => {
    selectMock.mockResolvedValueOnce([]);
    const result = await getStrategyNote(42);
    expect(result).toBeNull();
    expect(selectMock).toHaveBeenCalledWith(
      "SELECT * FROM unit_strategy_notes WHERE unit_id = $1 LIMIT 1",
      [42]
    );
  });

  it("returns the row with all 18 columns (10 existing + 8 new from migration 004) when one exists", async () => {
    const fakeRow = {
      id: 1, unit_id: 42,
      battlefield_role: "Anvil", strengths: null, weaknesses: null,
      best_targets: null, synergies: null, mistakes_to_avoid: null,
      rules_references: null, notes: null,
      move: 6, toughness: 4, save: 3, wounds: 2, leadership: 6, objective_control: 1,
      keywords: "Infantry", abilities: null,
      created_at: "2026-05-01", updated_at: "2026-05-01",
    };
    selectMock.mockResolvedValueOnce([fakeRow]);
    const result = await getStrategyNote(42);
    expect(result).toEqual(fakeRow);
    expect(result?.save).toBe(3); // INTEGER, not string "3+"
  });
});

describe("strategyNotes queries â€” upsertStrategyNote (select-then-insert/update)", () => {
  const baseInput = {
    unit_id: 42,
    move: 6, toughness: 4, save: 3, wounds: 2, leadership: 6, objective_control: 1,
    keywords: "Infantry", abilities: null,
    battlefield_role: null, strengths: null, weaknesses: null,
    best_targets: null, synergies: null, mistakes_to_avoid: null,
    rules_references: null, notes: null,
  };

  it("INSERT path: when SELECT returns no row, runs INSERT with all 17 fields including new stat columns", async () => {
    selectMock.mockResolvedValueOnce([]); // no existing row
    executeMock.mockResolvedValueOnce(undefined);

    await upsertStrategyNote(baseInput);

    expect(selectMock).toHaveBeenCalledWith(
      "SELECT id FROM unit_strategy_notes WHERE unit_id = $1",
      [42]
    );
    expect(executeMock).toHaveBeenCalledTimes(1);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO unit_strategy_notes/);
    expect(sql).toMatch(/VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9, \$10, \$11, \$12, \$13, \$14, \$15, \$16, \$17\)/);
    expect(params).toEqual([
      42, 6, 4, 3, 2, 6, 1, "Infantry", null,
      null, null, null, null, null, null, null, null,
    ]);
  });

  it("UPDATE path: when SELECT returns a row, runs UPDATE WHERE unit_id=$1 with all 16 fields + datetime('now') for updated_at", async () => {
    selectMock.mockResolvedValueOnce([{ id: 99 }]); // existing row
    executeMock.mockResolvedValueOnce(undefined);

    await upsertStrategyNote(baseInput);

    expect(executeMock).toHaveBeenCalledTimes(1);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/UPDATE unit_strategy_notes SET/);
    expect(sql).toMatch(/updated_at=datetime\('now'\)/);
    expect(sql).toMatch(/WHERE unit_id=\$1/);
    expect(params).toEqual([
      42, 6, 4, 3, 2, 6, 1, "Infantry", null,
      null, null, null, null, null, null, null, null,
    ]);
  });

  it("save column accepts integer (3) and stores as INTEGER â€” never as string '3+'", async () => {
    selectMock.mockResolvedValueOnce([]);
    executeMock.mockResolvedValueOnce(undefined);

    await upsertStrategyNote({ ...baseInput, save: 3 });

    const params = executeMock.mock.calls[0][1] as unknown[];
    // save is the 4th positional ($4) â€” index 3 in the params array (after unit_id, move, toughness)
    expect(params[3]).toBe(3);
    expect(typeof params[3]).toBe("number");
  });
});
