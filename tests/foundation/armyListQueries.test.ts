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
  getArmyListUnitNames,
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

  it("getArmyListWithUnits(listId) LEFT JOINs units (ghost support) + unit_overrides + synced_unit_points + synced_unit_point_tiers and computes 6-level COALESCE effective_points (Phase 89)", async () => {
    selectMock.mockResolvedValueOnce([]);
    await getArmyListWithUnits(7);

    const [sql, params] = selectMock.mock.calls[0];
    // Phase 89: LEFT JOIN (not INNER JOIN) to support ghost units (unit_id IS NULL)
    expect(sql).toMatch(/LEFT JOIN units u ON u\.id = alu\.unit_id/);
    expect(sql).toMatch(/LEFT JOIN unit_overrides uo ON uo\.unit_id = u\.id/);
    // unit_rules_mapping join for canonical datasheet name resolution
    expect(sql).toMatch(/LEFT JOIN unit_rules_mapping urm ON urm\.unit_id = u\.id/);
    // synced join uses COALESCE(urm.datasheet_name, u.name, alu.ghost_unit_name) for canonical name + ghost unit support
    expect(sql).toMatch(/LEFT JOIN synced_unit_points sup/);
    expect(sql).toMatch(/sup\.unit_name = COALESCE\(urm\.datasheet_name, u\.name, alu\.ghost_unit_name\)/);
    // Phase 89: 6-level COALESCE includes tier.points at priority level 2
    expect(sql).toMatch(/COALESCE\(alu\.points_override, tier\.points, sup\.points, uo\.points, u\.points, 0\) AS effective_points/);
    expect(sql).toMatch(/WHERE alu\.list_id = \$1/);
    // Phase 89: ORDER BY includes alu.id ASC tiebreaker (D-11)
    expect(sql).toMatch(/ORDER BY alu\.created_at ASC, alu\.id ASC/);
    expect(params).toEqual([7]);
  });
});

describe("armyLists queries — getArmyListUnitNames (PI-03 deviation)", () => {
  it("getArmyListUnitNames() LEFT JOINs units and uses COALESCE for unit_name (Phase 89 ghost unit support)", async () => {
    const mockRows = [
      { list_id: 1, list_name: "Alpha Strike", unit_name: "Intercessors" },
      { list_id: 1, list_name: "Alpha Strike", unit_name: "Hellblasters" },
      { list_id: 2, list_name: "Krush Brigade", unit_name: "Intercessors" },
    ];
    selectMock.mockResolvedValueOnce(mockRows);

    const result = await getArmyListUnitNames();

    expect(result).toEqual(mockRows);
    const [sql] = selectMock.mock.calls[0];
    expect(sql).toMatch(/JOIN army_list_units alu ON alu\.list_id = al\.id/);
    // Phase 89: LEFT JOIN (not INNER JOIN) to include ghost units
    expect(sql).toMatch(/LEFT JOIN units u ON u\.id = alu\.unit_id/);
    expect(sql).toMatch(/al\.id AS list_id/);
    expect(sql).toMatch(/al\.name AS list_name/);
    // Phase 89: COALESCE(u.name, alu.ghost_unit_name) instead of u.name AS unit_name
    expect(sql).toMatch(/COALESCE\(u\.name, alu\.ghost_unit_name\) AS unit_name/);
    expect(sql).toMatch(/ORDER BY al\.id/);
  });

  it("getArmyListUnitNames() takes no parameters (no WHERE clause filtering)", async () => {
    selectMock.mockResolvedValueOnce([]);
    await getArmyListUnitNames();

    // Should be called with just the SQL string, no params array
    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(selectMock.mock.calls[0]).toHaveLength(1);
  });

  it("getArmyListUnitNames() returns empty array when no army lists have units", async () => {
    selectMock.mockResolvedValueOnce([]);
    const result = await getArmyListUnitNames();
    expect(result).toEqual([]);
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

  it("deleteArmyList explicitly deletes children then parent in correct FK order", async () => {
    // deleteArmyList now makes 5 execute calls in dependency order
    executeMock.mockResolvedValue(undefined);
    await deleteArmyList(5);

    expect(executeMock).toHaveBeenCalledTimes(5);
    // 1. Delete enhancements first (FK to army_list_units + army_lists)
    expect(executeMock.mock.calls[0]).toEqual([
      "DELETE FROM army_list_enhancements WHERE list_id = $1", [5],
    ]);
    // 2. Delete snapshots (FK to army_lists)
    expect(executeMock.mock.calls[1]).toEqual([
      "DELETE FROM army_list_snapshots WHERE list_id = $1", [5],
    ]);
    // 3. Clear self-referencing FK before deleting units
    expect(executeMock.mock.calls[2]).toEqual([
      "UPDATE army_list_units SET leader_attached_to_id = NULL WHERE list_id = $1", [5],
    ]);
    // 4. Delete army list units
    expect(executeMock.mock.calls[3]).toEqual([
      "DELETE FROM army_list_units WHERE list_id = $1", [5],
    ]);
    // 5. Delete the army list itself (parent)
    expect(executeMock.mock.calls[4]).toEqual([
      "DELETE FROM army_lists WHERE id = $1", [5],
    ]);
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
    await updateArmyListUnit({ id: 7, points_override: 250, notes: "v2", tactical_role: null });

    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toBe("UPDATE army_list_units SET points_override=$2, notes=$3, tactical_role=$4 WHERE id=$1");
    expect(sql).not.toMatch(/COALESCE/i);
    expect(params).toEqual([7, 250, "v2", null]);
  });

  it("passing { id, points_override: null, notes: null } sets both columns to NULL in the DB", async () => {
    executeMock.mockResolvedValueOnce(undefined);
    await updateArmyListUnit({ id: 7, points_override: null, notes: null, tactical_role: null });

    const [, params] = executeMock.mock.calls[0];
    expect(params).toEqual([7, null, null, null]);
  });
});
