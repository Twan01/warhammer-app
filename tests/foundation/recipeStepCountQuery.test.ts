/**
 * SCHEMA-04 — getStepCountsByRecipe batch query unit tests.
 *
 * Verifies the exact SQL string, row mapping, and empty-result behavior
 * for the GROUP BY batch query that replaces the N+1 per-recipe pattern.
 *
 * Pattern mirrors tests/paint-inventory/recipePaintQuery.test.ts.
 * Mocks getDb() so no Tauri IPC is needed in jsdom.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

// Import AFTER vi.mock so the mocked client is used
import { getStepCountsByRecipe } from "@/db/queries/recipePaints";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("recipePaints queries — getStepCountsByRecipe (SCHEMA-04)", () => {
  it("calls db.select with a SQL string containing SELECT recipe_id, COUNT(*) AS step_count FROM recipe_steps GROUP BY recipe_id", async () => {
    selectMock.mockResolvedValueOnce([]);
    await getStepCountsByRecipe();
    expect(selectMock).toHaveBeenCalledOnce();
    const [sql] = selectMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/SELECT\s+recipe_id,\s*COUNT\(\*\)\s+AS\s+step_count/i);
    expect(sql).toMatch(/FROM\s+recipe_steps/i);
    expect(sql).toMatch(/GROUP\s+BY\s+recipe_id/i);
  });

  it("maps rows correctly to RecipeStepCount[] array", async () => {
    selectMock.mockResolvedValueOnce([
      { recipe_id: 1, step_count: 3 },
      { recipe_id: 2, step_count: 5 },
      { recipe_id: 7, step_count: 1 },
    ]);
    const result = await getStepCountsByRecipe();
    expect(result).toEqual([
      { recipe_id: 1, step_count: 3 },
      { recipe_id: 2, step_count: 5 },
      { recipe_id: 7, step_count: 1 },
    ]);
  });

  it("returns an empty array when no recipe_steps rows exist", async () => {
    selectMock.mockResolvedValueOnce([]);
    const result = await getStepCountsByRecipe();
    expect(result).toEqual([]);
  });
});
