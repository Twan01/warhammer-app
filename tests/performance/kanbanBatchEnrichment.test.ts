/**
 * PERF-03 — Tests for getKanbanProgressByUnitIds batched SQL query.
 *
 * Verifies:
 * 1. Single db.select call with IN-clause parameterization for multiple unit IDs
 * 2. Empty array guard clause (returns [] without calling db.select)
 * 3. SQL references the correct tables (unit_recipe_assignments, painting_recipes)
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock }),
}));

import { getKanbanProgressByUnitIds } from "@/db/queries/recipeAssignments";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getKanbanProgressByUnitIds", () => {
  it("calls db.select once with IN ($1, $2) and params [1, 2]", async () => {
    selectMock.mockResolvedValueOnce([]);

    await getKanbanProgressByUnitIds([1, 2]);

    expect(selectMock).toHaveBeenCalledTimes(1);
    const [sql, params] = selectMock.mock.calls[0] as [string, number[]];
    expect(sql).toMatch(/IN \(\$1, \$2\)/);
    expect(params).toEqual([1, 2]);
  });

  it("returns empty array when unitIds is empty (guard clause)", async () => {
    const result = await getKanbanProgressByUnitIds([]);
    expect(result).toEqual([]);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("SQL references unit_recipe_assignments table", async () => {
    selectMock.mockResolvedValueOnce([]);

    await getKanbanProgressByUnitIds([5]);

    const [sql] = selectMock.mock.calls[0] as [string, number[]];
    expect(sql).toContain("unit_recipe_assignments");
  });

  it("SQL references painting_recipes table for recipe name", async () => {
    selectMock.mockResolvedValueOnce([]);

    await getKanbanProgressByUnitIds([5]);

    const [sql] = selectMock.mock.calls[0] as [string, number[]];
    expect(sql).toContain("painting_recipes");
  });

  it("SQL uses ROW_NUMBER() OVER (PARTITION BY unit_id) CTE approach", async () => {
    selectMock.mockResolvedValueOnce([]);

    await getKanbanProgressByUnitIds([3]);

    const [sql] = selectMock.mock.calls[0] as [string, number[]];
    expect(sql).toMatch(/ROW_NUMBER\(\) OVER \(PARTITION BY unit_id/i);
  });

  it("correctly builds IN-clause for a single unit ID", async () => {
    selectMock.mockResolvedValueOnce([]);

    await getKanbanProgressByUnitIds([42]);

    expect(selectMock).toHaveBeenCalledTimes(1);
    const [sql, params] = selectMock.mock.calls[0] as [string, number[]];
    expect(sql).toMatch(/IN \(\$1\)/);
    expect(params).toEqual([42]);
  });

  it("returns the rows from db.select", async () => {
    const mockRows = [
      {
        unit_id: 1,
        assignment_id: 10,
        assignment_count: 2,
        recipe_id: 5,
        recipe_name: "Test Recipe",
        total_steps: 3,
        completed_steps: 1,
      },
    ];
    selectMock.mockResolvedValueOnce(mockRows);

    const result = await getKanbanProgressByUnitIds([1]);

    expect(result).toEqual(mockRows);
  });
});
