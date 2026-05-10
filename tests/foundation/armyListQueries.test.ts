/**
 * STRAT-06 (Phase 6 Success Criteria 4) — Army list query function tests.
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 * Verifies SQL strings + parameter arrays. Critical assertion: updateArmyListUnit
 * uses full-replacement UPDATE (NOT COALESCE) so points_override can be cleared.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import {
  getArmyLists,
  getArmyListWithUnits,
  createArmyList,
  updateArmyList,
  deleteArmyList,
  addUnitToList,
  removeUnitFromList,
  updateArmyListUnit,
} from "@/db/queries/armyLists";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("armyLists queries — getArmyLists / getArmyListWithUnits", () => {
  it("getArmyLists() calls db.select with 'SELECT * FROM army_lists ORDER BY name ASC'", async () => {
    selectMock.mockResolvedValueOnce([]);
    await getArmyLists();
    expect(selectMock).toHaveBeenCalledWith("SELECT * FROM army_lists ORDER BY name ASC");
  });

  it("getArmyListWithUnits(listId) JOINs units + unit_overrides and computes 3-level COALESCE effective_points", async () => {
    selectMock.mockResolvedValueOnce([]);
    await getArmyListWithUnits(7);

    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).toMatch(/JOIN units u ON u\.id = alu\.unit_id/);
    expect(sql).toMatch(/LEFT JOIN unit_overrides uo ON uo\.unit_id = u\.id/);
    expect(sql).toMatch(/COALESCE\(alu\.points_override, uo\.points, u\.points, 0\) AS effective_points/);
    expect(sql).toMatch(/WHERE alu\.list_id = \$1/);
    expect(sql).toMatch(/ORDER BY alu\.created_at ASC/);
    expect(params).toEqual([7]);
  });
});

describe("armyLists queries — createArmyList / updateArmyList / deleteArmyList", () => {
  it("createArmyList INSERTs name, faction_id, points_limit, list_type, notes, detachment_id, detachment_name and returns lastInsertId", async () => {
    executeMock.mockResolvedValueOnce({ lastInsertId: 11 });
    const id = await createArmyList({
      name: "List A", faction_id: 2, points_limit: 1000,
      list_type: "Casual", notes: "test",
      detachment_id: null, detachment_name: null,
    });
    expect(id).toBe(11);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO army_lists \(name, faction_id, points_limit, list_type, notes, detachment_id, detachment_name\)/);
    expect(params).toEqual(["List A", 2, 1000, "Casual", "test", null, null]);
  });

  it("updateArmyList uses COALESCE partial-update pattern matching updateUnit/updatePaint", async () => {
    executeMock.mockResolvedValueOnce(undefined);
    await updateArmyList({ id: 5, name: "Renamed" });
    const [sql] = executeMock.mock.calls[0];
    expect(sql).toMatch(/SET\s+name\s*=\s*COALESCE\(\$2, name\)/);
    expect(sql).toMatch(/updated_at\s*=\s*datetime\('now'\)/);
    expect(sql).toMatch(/WHERE id = \$1/);
  });

  it("deleteArmyList runs DELETE FROM army_lists WHERE id = $1", async () => {
    executeMock.mockResolvedValueOnce(undefined);
    await deleteArmyList(5);
    expect(executeMock).toHaveBeenCalledWith("DELETE FROM army_lists WHERE id = $1", [5]);
  });
});

describe("armyLists queries — addUnitToList / removeUnitFromList", () => {
  it("addUnitToList INSERTs list_id, unit_id, points_override, notes (allows duplicate unit_id for same list_id)", async () => {
    // Two inserts with same list_id+unit_id should both succeed at the SQL level.
    executeMock.mockResolvedValueOnce({ lastInsertId: 100 });
    executeMock.mockResolvedValueOnce({ lastInsertId: 101 });

    const id1 = await addUnitToList({ list_id: 1, unit_id: 42, points_override: 100, notes: null });
    const id2 = await addUnitToList({ list_id: 1, unit_id: 42, points_override: null, notes: null });

    expect(id1).toBe(100);
    expect(id2).toBe(101);

    const [sql] = executeMock.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO army_list_units \(list_id, unit_id, points_override, notes\)/);
    expect(sql).not.toMatch(/INSERT OR IGNORE/i);
    expect(sql).not.toMatch(/ON CONFLICT/i);
  });

  it("removeUnitFromList runs DELETE FROM army_list_units WHERE id = $1", async () => {
    executeMock.mockResolvedValueOnce(undefined);
    await removeUnitFromList(99);
    expect(executeMock).toHaveBeenCalledWith("DELETE FROM army_list_units WHERE id = $1", [99]);
  });
});

describe("armyLists queries — updateArmyListUnit (NULL-passthrough)", () => {
  it("UPDATE statement is 'SET points_override=$2, notes=$3' — NOT COALESCE — so points_override can be cleared to NULL", async () => {
    executeMock.mockResolvedValueOnce(undefined);
    await updateArmyListUnit({ id: 7, points_override: 250, notes: "v2" });

    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toBe("UPDATE army_list_units SET points_override=$2, notes=$3 WHERE id=$1");
    expect(sql).not.toMatch(/COALESCE/i);
    expect(params).toEqual([7, 250, "v2"]);
  });

  it("passing { id, points_override: null, notes: null } sets both columns to NULL in the DB", async () => {
    executeMock.mockResolvedValueOnce(undefined);
    await updateArmyListUnit({ id: 7, points_override: null, notes: null });

    const [, params] = executeMock.mock.calls[0];
    expect(params).toEqual([7, null, null]);
  });
});
