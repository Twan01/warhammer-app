/**
 * ARMY-05 — getArmyListsByUnitId query test.
 *
 * The other army list query functions (createArmyList, addUnitToList,
 * updateArmyListUnit, etc.) are covered by tests/foundation/armyListQueries.test.ts
 * — do NOT duplicate. This file ONLY tests the new query added in plan 08-00.
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import { getArmyListsByUnitId } from "@/db/queries/armyLists";

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
