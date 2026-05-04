/**
 * Phase 18 — Battle Log query module SQL contract tests.
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 * Mirrors tests/foundation/armyListQueries.test.ts.
 *
 * Covers BATTLE-01 (create with required cols), BATTLE-02 (army_list_id
 * nullable + full-replacement UPDATE for nullable FKs), BATTLE-03 (notes columns +
 * mvp/underperforming unit FKs), BATTLE-05 (delete by id).
 */
import { describe, it, vi, expect, beforeEach } from "vitest";
const selectMock = vi.fn();
const executeMock = vi.fn();
vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));
import {
  getBattleLogs,
  getBattleLogSummary,
  createBattleLog,
  updateBattleLog,
  deleteBattleLog,
} from "@/db/queries/battleLogs";
beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("battleLogs queries — getBattleLogs (BATTLE-04)", () => {
  it("calls db.select with 'SELECT * FROM battle_logs ORDER BY battle_date DESC, created_at DESC'", async () => {
    selectMock.mockResolvedValue([]);
    await getBattleLogs();
    expect(selectMock).toHaveBeenCalledWith(
      "SELECT * FROM battle_logs ORDER BY battle_date DESC, created_at DESC"
    );
  });
});

describe("battleLogs queries — getBattleLogSummary (BATTLE-04)", () => {
  it("calls db.select with 'SELECT result, COUNT(*) AS count FROM battle_logs GROUP BY result'", async () => {
    selectMock.mockResolvedValue([]);
    await getBattleLogSummary();
    expect(selectMock).toHaveBeenCalledWith(
      "SELECT result, COUNT(*) AS count FROM battle_logs GROUP BY result"
    );
  });
});

describe("battleLogs queries — createBattleLog (BATTLE-01, BATTLE-02, BATTLE-03)", () => {
  it("INSERTs all 14 columns in the documented order and returns lastInsertId", async () => {
    executeMock.mockResolvedValue({ lastInsertId: 42, rowsAffected: 1 });
    const input = {
      army_list_id: 1,
      battle_date: "2026-01-15",
      opponent: "Alice",
      opponent_faction: "Chaos Space Marines",
      mission: "Scorched Earth",
      points_played: 2000,
      result: "Win" as const,
      my_score: 85,
      opponent_score: 60,
      mvp_unit_id: 5,
      underperforming_unit_id: 3,
      lessons_learned: "Deploy better",
      changes_next_time: "More scouts",
      notes: "Great game",
    };
    const id = await createBattleLog(input);
    expect(id).toBe(42);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO battle_logs/);
    expect(sql).toMatch(/\$14\)/);
    expect(params).toHaveLength(14);
  });

  it("passes null for nullable fields when input properties are undefined (army_list_id, opponent, points_played, my_score, opponent_score, mvp_unit_id, underperforming_unit_id, lessons_learned, changes_next_time, notes)", async () => {
    executeMock.mockResolvedValue({ lastInsertId: 1, rowsAffected: 1 });
    const input = {
      army_list_id: undefined,
      battle_date: "2026-01-15",
      opponent: undefined,
      opponent_faction: "Necrons",
      mission: "No Mercy",
      points_played: undefined,
      result: "Loss" as const,
      my_score: undefined,
      opponent_score: undefined,
      mvp_unit_id: undefined,
      underperforming_unit_id: undefined,
      lessons_learned: undefined,
      changes_next_time: undefined,
      notes: undefined,
    };
    // Cast to any to test undefined handling
    await createBattleLog(input as unknown as Parameters<typeof createBattleLog>[0]);
    const [, params] = executeMock.mock.calls[0];
    // Index 0: army_list_id, 2: opponent, 5: points_played, 7: my_score,
    // 8: opponent_score, 9: mvp_unit_id, 10: underperforming_unit_id,
    // 11: lessons_learned, 12: changes_next_time, 13: notes
    expect(params[0]).toBeNull(); // army_list_id
    expect(params[2]).toBeNull(); // opponent
    expect(params[5]).toBeNull(); // points_played
    expect(params[7]).toBeNull(); // my_score
    expect(params[8]).toBeNull(); // opponent_score
    expect(params[9]).toBeNull(); // mvp_unit_id
    expect(params[10]).toBeNull(); // underperforming_unit_id
    expect(params[11]).toBeNull(); // lessons_learned
    expect(params[12]).toBeNull(); // changes_next_time
    expect(params[13]).toBeNull(); // notes
  });
});

describe("battleLogs queries — updateBattleLog (BATTLE-02 — Pitfall 5: full-replacement UPDATE for nullable FKs)", () => {
  it("uses full-replacement UPDATE (SET army_list_id = $2) — does NOT use COALESCE for army_list_id, mvp_unit_id, or underperforming_unit_id", async () => {
    executeMock.mockResolvedValue({ rowsAffected: 1 });
    const input = {
      id: 1,
      army_list_id: null,
      battle_date: "2026-01-15",
      opponent: null,
      opponent_faction: "Tyranids",
      mission: "Priority Targets",
      points_played: null,
      result: "Draw" as const,
      my_score: null,
      opponent_score: null,
      mvp_unit_id: null,
      underperforming_unit_id: null,
      lessons_learned: null,
      changes_next_time: null,
      notes: null,
    };
    await updateBattleLog(input);
    const [sql] = executeMock.mock.calls[0];
    expect(sql).not.toMatch(/COALESCE/);
    expect(sql).toMatch(/SET\s+army_list_id\s*=\s*\$2/);
    expect(sql).toMatch(/mvp_unit_id\s*=\s*\$11/);
    expect(sql).toMatch(/underperforming_unit_id\s*=\s*\$12/);
  });

  it("includes WHERE id = $1 and binds id as the first positional parameter", async () => {
    executeMock.mockResolvedValue({ rowsAffected: 1 });
    const input = {
      id: 99,
      army_list_id: null,
      battle_date: "2026-02-01",
      opponent: null,
      opponent_faction: "Orks",
      mission: "Purge the Alien",
      points_played: null,
      result: "Win" as const,
      my_score: null,
      opponent_score: null,
      mvp_unit_id: null,
      underperforming_unit_id: null,
      lessons_learned: null,
      changes_next_time: null,
      notes: null,
    };
    await updateBattleLog(input);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/WHERE id = \$1/);
    expect(params[0]).toBe(99);
  });

  it("does NOT touch updated_at column (battle_logs schema has no updated_at)", async () => {
    executeMock.mockResolvedValue({ rowsAffected: 1 });
    const input = {
      id: 5,
      army_list_id: null,
      battle_date: "2026-03-10",
      opponent: null,
      opponent_faction: "Eldar",
      mission: "Capture and Hold",
      points_played: null,
      result: "Loss" as const,
      my_score: null,
      opponent_score: null,
      mvp_unit_id: null,
      underperforming_unit_id: null,
      lessons_learned: null,
      changes_next_time: null,
      notes: null,
    };
    await updateBattleLog(input);
    const [sql] = executeMock.mock.calls[0];
    expect(sql).not.toMatch(/updated_at/);
  });
});

describe("battleLogs queries — deleteBattleLog (BATTLE-05)", () => {
  it("runs DELETE FROM battle_logs WHERE id = $1 with the given id", async () => {
    executeMock.mockResolvedValue({ rowsAffected: 1 });
    await deleteBattleLog(42);
    expect(executeMock).toHaveBeenCalledWith(
      "DELETE FROM battle_logs WHERE id = $1",
      [42]
    );
  });
});
