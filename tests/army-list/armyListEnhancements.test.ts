/**
 * Phase 89 — army_list_enhancements CRUD query tests (D-01, D-02).
 *
 * Tests addEnhancement, removeEnhancement, getEnhancementsByList.
 * Enhancement points are tracked separately from the per-unit COALESCE chain.
 * Stored as TEXT/INTEGER copies at assignment time (survives rules.db re-sync).
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
  addEnhancement,
  removeEnhancement,
  getEnhancementsByList,
} from "@/db/queries/armyLists";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("addEnhancement (Phase 89 D-01)", () => {
  it("inserts into army_list_enhancements with $1-$4 params and returns lastInsertId", async () => {
    executeMock.mockResolvedValueOnce({ lastInsertId: 42, rowsAffected: 1 });

    const result = await addEnhancement({
      list_id: 1,
      army_list_unit_id: 10,
      enhancement_name: "Warlord Trait: Iron Will",
      enhancement_points: 30,
    });

    expect(result).toBe(42);
    expect(executeMock).toHaveBeenCalledTimes(1);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/INSERT\s+INTO\s+army_list_enhancements/i);
    expect(sql).toMatch(/list_id/i);
    expect(sql).toMatch(/army_list_unit_id/i);
    expect(sql).toMatch(/enhancement_name/i);
    expect(sql).toMatch(/enhancement_points/i);
    expect(params).toEqual([1, 10, "Warlord Trait: Iron Will", 30]);
  });

  it("returns 0 when lastInsertId is undefined", async () => {
    executeMock.mockResolvedValueOnce({ rowsAffected: 1 });

    const result = await addEnhancement({
      list_id: 2,
      army_list_unit_id: 5,
      enhancement_name: "Relics of the Chapter",
      enhancement_points: 15,
    });

    expect(result).toBe(0);
  });

  it("stores TEXT copy of enhancement_name (denormalized — not FK to synced_enhancements)", async () => {
    executeMock.mockResolvedValueOnce({ lastInsertId: 7, rowsAffected: 1 });

    await addEnhancement({
      list_id: 3,
      army_list_unit_id: 11,
      enhancement_name: "Rapid Assault",
      enhancement_points: 0,
    });

    const [, params] = executeMock.mock.calls[0];
    // enhancement_name is passed as a string parameter, not a FK id
    expect(typeof params[2]).toBe("string");
    expect(params[2]).toBe("Rapid Assault");
    // 0 is a valid enhancement_points value
    expect(params[3]).toBe(0);
  });
});

describe("removeEnhancement (Phase 89)", () => {
  it("issues DELETE FROM army_list_enhancements WHERE id = $1", async () => {
    executeMock.mockResolvedValueOnce({ rowsAffected: 1 });

    await removeEnhancement(99);

    expect(executeMock).toHaveBeenCalledTimes(1);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/DELETE\s+FROM\s+army_list_enhancements/i);
    expect(sql).toMatch(/WHERE\s+id\s*=\s*\$1/);
    expect(params).toEqual([99]);
  });

  it("does not affect other rows (single-id delete by enhancement id)", async () => {
    executeMock.mockResolvedValueOnce({ rowsAffected: 1 });

    await removeEnhancement(7);

    const [sql, params] = executeMock.mock.calls[0];
    // Should only delete by enhancement id, not by list_id
    expect(sql).not.toMatch(/list_id/i);
    expect(params).toEqual([7]);
  });
});

describe("getEnhancementsByList (Phase 89)", () => {
  it("issues SELECT * FROM army_list_enhancements WHERE list_id = $1 ORDER BY created_at ASC", async () => {
    selectMock.mockResolvedValueOnce([]);

    await getEnhancementsByList(5);

    expect(selectMock).toHaveBeenCalledTimes(1);
    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).toMatch(/SELECT\s+\*/i);
    expect(sql).toMatch(/FROM\s+army_list_enhancements/i);
    expect(sql).toMatch(/WHERE\s+list_id\s*=\s*\$1/);
    expect(sql).toMatch(/ORDER\s+BY\s+created_at\s+ASC/i);
    expect(params).toEqual([5]);
  });

  it("returns the rows from db.select unchanged (passthrough)", async () => {
    const fixture = [
      {
        id: 1,
        list_id: 5,
        army_list_unit_id: 10,
        enhancement_name: "Warlord Trait: Iron Will",
        enhancement_points: 30,
        created_at: "2026-05-20T10:00:00Z",
      },
      {
        id: 2,
        list_id: 5,
        army_list_unit_id: 11,
        enhancement_name: "Relic: Shield Eternal",
        enhancement_points: 25,
        created_at: "2026-05-20T10:01:00Z",
      },
    ];
    selectMock.mockResolvedValueOnce(fixture);

    const result = await getEnhancementsByList(5);
    expect(result).toEqual(fixture);
  });

  it("returns empty array when list has no enhancements", async () => {
    selectMock.mockResolvedValueOnce([]);

    const result = await getEnhancementsByList(999);
    expect(result).toEqual([]);
  });
});
