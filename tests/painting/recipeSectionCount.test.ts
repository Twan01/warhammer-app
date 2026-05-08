/**
 * INTG-02 — getSectionCountsByRecipe query coverage (TDD RED scaffold).
 *
 * These tests will FAIL until Task 2 adds getSectionCountsByRecipe to
 * src/db/queries/recipeSections.ts. RED phase by design.
 *
 * Mirrors the getStepCountsByRecipe pattern in src/db/queries/recipePaints.ts.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: vi.fn() }),
}));

// Import AFTER vi.mock — function does not exist yet (RED phase)
import { getSectionCountsByRecipe } from "@/db/queries/recipeSections";

beforeEach(() => {
  selectMock.mockReset();
  selectMock.mockResolvedValue([]);
});

describe("getSectionCountsByRecipe — INTG-02 batch section count query", () => {
  it("returns section count per recipe via GROUP BY", async () => {
    selectMock.mockResolvedValueOnce([
      { recipe_id: 1, section_count: 3 },
      { recipe_id: 2, section_count: 1 },
    ]);
    const result = await getSectionCountsByRecipe();
    expect(result).toEqual([
      { recipe_id: 1, section_count: 3 },
      { recipe_id: 2, section_count: 1 },
    ]);
  });

  it("executes SQL with GROUP BY recipe_id referencing recipe_sections", async () => {
    selectMock.mockResolvedValueOnce([]);
    await getSectionCountsByRecipe();
    const [sql] = selectMock.mock.calls[0];
    expect(sql).toContain("GROUP BY recipe_id");
    expect(sql).toContain("recipe_sections");
  });

  it("passes empty params array", async () => {
    selectMock.mockResolvedValueOnce([]);
    await getSectionCountsByRecipe();
    const [, params] = selectMock.mock.calls[0];
    expect(params).toEqual([]);
  });
});
