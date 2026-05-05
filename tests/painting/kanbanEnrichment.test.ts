import { vi, describe, it, expect, beforeEach } from "vitest";

/**
 * PROJ-01 — batch enrichment query functions for kanban cards.
 */

const recipesSelectMock = vi.fn();
const photosSelectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: recipesSelectMock }),
}));

import { getRecipeNamesByUnitIds } from "@/db/queries/recipes";
import { getPhotoCountsByUnitIds } from "@/db/queries/unitPhotos";

// Note: both modules share the same mocked getDb; we use recipesSelectMock for both
// since the mock returns a single select fn shared across the module boundary.

beforeEach(() => {
  recipesSelectMock.mockReset();
  photosSelectMock.mockReset();
});

describe("getRecipeNamesByUnitIds", () => {
  it("returns { unit_id, name } for each unit with a linked recipe", async () => {
    recipesSelectMock.mockResolvedValueOnce([
      { unit_id: 1, name: "NMM Gold" },
      { unit_id: 2, name: "Red Gore" },
    ]);

    const result = await getRecipeNamesByUnitIds([1, 2]);

    expect(result).toEqual([
      { unit_id: 1, name: "NMM Gold" },
      { unit_id: 2, name: "Red Gore" },
    ]);
  });

  it("excludes faction-wide recipes where unit_id IS NULL", async () => {
    recipesSelectMock.mockResolvedValueOnce([]);

    await getRecipeNamesByUnitIds([1]);

    const [sql] = recipesSelectMock.mock.calls[0];
    // Query targets unit_id IN (...) — rows where unit_id IS NULL are never returned
    expect(sql).toMatch(/unit_id IN/);
    expect(sql).not.toMatch(/unit_id IS NULL/);
  });

  it("returns empty array when unitIds is empty (guard clause)", async () => {
    const result = await getRecipeNamesByUnitIds([]);

    expect(result).toEqual([]);
    expect(recipesSelectMock).not.toHaveBeenCalled();
  });

  it("uses positional $1, $2 params for IN clause — Pitfall 3", async () => {
    recipesSelectMock.mockResolvedValueOnce([]);

    await getRecipeNamesByUnitIds([5, 6]);

    const [sql, params] = recipesSelectMock.mock.calls[0];
    expect(sql).toMatch(/\$1, \$2/);
    expect(params).toEqual([5, 6]);
  });
});

describe("getPhotoCountsByUnitIds (kanban)", () => {
  it("returns { entity_id, photo_count } grouped by entity_id", async () => {
    recipesSelectMock.mockResolvedValueOnce([
      { entity_id: 3, photo_count: 2 },
    ]);

    const result = await getPhotoCountsByUnitIds([3]);

    expect(result).toEqual([{ entity_id: 3, photo_count: 2 }]);
  });

  it("returns empty array when unitIds is empty", async () => {
    const result = await getPhotoCountsByUnitIds([]);

    expect(result).toEqual([]);
    // guard clause — db.select never called
    expect(recipesSelectMock).not.toHaveBeenCalled();
  });
});
