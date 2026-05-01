/**
 * PINV-05 — getRecipeIdsByPaintId query unit tests.
 * Tests Phase 7 plan 07-02.
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 * Asserts the exact SQL string + params + row-to-number mapping.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

// Import AFTER vi.mock so the mocked client is used
import { getRecipeIdsByPaintId } from "@/db/queries/recipePaints";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("recipePaints queries — getRecipeIdsByPaintId", () => {
  it("calls db.select with literal SQL 'SELECT DISTINCT recipe_id FROM recipe_paints WHERE paint_id = $1' and params [paintId]", async () => {
    selectMock.mockResolvedValueOnce([]);
    await getRecipeIdsByPaintId(5);
    expect(selectMock).toHaveBeenCalledWith(
      "SELECT DISTINCT recipe_id FROM recipe_paints WHERE paint_id = $1",
      [5],
    );
  });

  it("maps row objects to a plain number[] of recipe ids", async () => {
    selectMock.mockResolvedValueOnce([
      { recipe_id: 1 },
      { recipe_id: 2 },
      { recipe_id: 3 },
    ]);
    const result = await getRecipeIdsByPaintId(5);
    expect(result).toEqual([1, 2, 3]);
  });

  it("returns an empty array when no recipe references the paint", async () => {
    selectMock.mockResolvedValueOnce([]);
    const result = await getRecipeIdsByPaintId(999);
    expect(result).toEqual([]);
  });
});
