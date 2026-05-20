/**
 * ARMY-05 — getArmyListsByUnitId query test.
 *
 * The other army list query functions (createArmyList, addUnitToList,
 * updateArmyListUnit, etc.) are covered by tests/foundation/armyListQueries.test.ts
 * — do NOT duplicate. This file ONLY tests the new query added in plan 08-00.
 *
 * Phase 89 additions: setWarlord, addGhostUnitToList, clearLeaderAttachment,
 * clearSelectedModelCount (D-10, D-04, D-13).
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import {
  getArmyListsByUnitId,
  setWarlord,
  addGhostUnitToList,
  clearLeaderAttachment,
  clearSelectedModelCount,
} from "@/db/queries/armyLists";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("armyLists queries — getArmyListsByUnitId (ARMY-05)", () => {
  it("issues SELECT al.id, al.name JOIN army_list_units WHERE alu.unit_id = $1 with [unitId]", async () => {
    selectMock.mockResolvedValueOnce([]);
    await getArmyListsByUnitId(42);

    expect(selectMock).toHaveBeenCalledTimes(1);
    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).toMatch(/SELECT\s+al\.id,\s*al\.name/);
    expect(sql).toMatch(/FROM\s+army_list_units\s+alu/);
    expect(sql).toMatch(/JOIN\s+army_lists\s+al\s+ON\s+al\.id\s*=\s*alu\.list_id/);
    expect(sql).toMatch(/WHERE\s+alu\.unit_id\s*=\s*\$1/);
    expect(params).toEqual([42]);
  });

  it("returns the rows from db.select unchanged (passthrough)", async () => {
    const fixture = [
      { id: 7, name: "My 1000pt List" },
      { id: 11, name: "Starter Game" },
    ];
    selectMock.mockResolvedValueOnce(fixture);

    const result = await getArmyListsByUnitId(42);
    expect(result).toEqual(fixture);
  });
});

// ─── Phase 89 query tests ────────────────────────────────────────────────────

describe("armyLists queries — setWarlord (Phase 89 D-10)", () => {
  it("issues CASE WHEN id = $1 THEN 1 ELSE 0 END WHERE list_id = $2", async () => {
    executeMock.mockResolvedValueOnce({ rowsAffected: 3 });

    await setWarlord(5, 2);

    expect(executeMock).toHaveBeenCalledTimes(1);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/SET\s+is_warlord\s*=\s*CASE\s+WHEN\s+id\s*=\s*\$1\s+THEN\s+1\s+ELSE\s+0\s+END/i);
    expect(sql).toMatch(/WHERE\s+list_id\s*=\s*\$2/);
    expect(params).toEqual([5, 2]);
  });

  it("scopes the UPDATE by list_id (Pitfall 4 — no cross-list mutation)", async () => {
    executeMock.mockResolvedValueOnce({ rowsAffected: 2 });

    await setWarlord(10, 7);

    const [sql, params] = executeMock.mock.calls[0];
    // Must have list_id scoping — not just id = $1 with no list guard
    expect(sql).toMatch(/WHERE\s+list_id\s*=\s*\$2/);
    expect(params[1]).toBe(7);
  });
});

describe("armyLists queries — addGhostUnitToList (Phase 89 D-04)", () => {
  it("inserts with unit_id = NULL and ghost_unit_name at $2 position", async () => {
    executeMock.mockResolvedValueOnce({ lastInsertId: 99, rowsAffected: 1 });

    const result = await addGhostUnitToList({
      list_id: 3,
      ghost_unit_name: "Intercessors",
      points_override: null,
      notes: null,
    });

    expect(result).toBe(99);
    expect(executeMock).toHaveBeenCalledTimes(1);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/INSERT\s+INTO\s+army_list_units/i);
    expect(sql).toMatch(/unit_id/i);
    expect(sql).toMatch(/ghost_unit_name/i);
    // unit_id is hardcoded NULL in the SQL (not a parameter)
    expect(sql).toMatch(/NULL/);
    // list_id is $1, ghost_unit_name is $2
    expect(params[0]).toBe(3);
    expect(params[1]).toBe("Intercessors");
  });

  it("passes points_override and notes as null when not provided", async () => {
    executeMock.mockResolvedValueOnce({ lastInsertId: 1, rowsAffected: 1 });

    await addGhostUnitToList({ list_id: 1, ghost_unit_name: "Ghost" });

    const [, params] = executeMock.mock.calls[0];
    expect(params[2]).toBeNull(); // points_override
    expect(params[3]).toBeNull(); // notes
  });
});

describe("armyLists queries — clearLeaderAttachment (Phase 89 D-13)", () => {
  it("issues SET leader_attached_to_id = NULL WHERE id = $1", async () => {
    executeMock.mockResolvedValueOnce({ rowsAffected: 1 });

    await clearLeaderAttachment(17);

    expect(executeMock).toHaveBeenCalledTimes(1);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/SET\s+leader_attached_to_id\s*=\s*NULL/);
    expect(sql).toMatch(/WHERE\s+id\s*=\s*\$1/);
    expect(params).toEqual([17]);
  });

  it("does NOT use COALESCE (explicit NULL passthrough)", async () => {
    executeMock.mockResolvedValueOnce({ rowsAffected: 1 });

    await clearLeaderAttachment(5);

    const [sql] = executeMock.mock.calls[0];
    expect(sql).not.toMatch(/COALESCE/i);
  });
});

describe("armyLists queries — clearSelectedModelCount (Phase 89 D-13)", () => {
  it("issues SET selected_model_count = NULL WHERE id = $1", async () => {
    executeMock.mockResolvedValueOnce({ rowsAffected: 1 });

    await clearSelectedModelCount(8);

    expect(executeMock).toHaveBeenCalledTimes(1);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/SET\s+selected_model_count\s*=\s*NULL/);
    expect(sql).toMatch(/WHERE\s+id\s*=\s*\$1/);
    expect(params).toEqual([8]);
  });
});
