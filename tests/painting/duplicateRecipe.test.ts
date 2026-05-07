/**
 * STUDIO-03 — duplicateRecipe SQL coverage.
 * Mocks getDb() to capture SQL strings and params.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import { duplicateRecipe } from "@/db/queries/recipes";
import type { PaintingRecipe } from "@/types/recipe";
import type { RecipeStep } from "@/types/recipePaint";

const RECIPE_FIXTURE: PaintingRecipe = {
  id: 1,
  name: "Space Marine Blue",
  faction_id: 2,
  unit_id: 3,
  area: "armour",
  primer: "Chaos Black",
  basecoat: "Macragge Blue",
  shade: "Nuln Oil",
  layer: "Calgar Blue",
  highlight: "Fenrisian Grey",
  glaze_filter: null,
  weathering: null,
  technical: null,
  basing: "Agrellan Earth",
  notes: "Classic blue",
  tutorial_link: null,
  style: "NMM",
  surface: "smooth",
  effect: null,
  difficulty: "beginner",
  estimated_minutes: 90,
  result_photo_path: "result.jpg",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const STEP_FIXTURES: RecipeStep[] = [
  {
    id: 10,
    recipe_id: 1,
    paint_id: 5,
    step_name: "Basecoat",
    order_index: 0,
    notes: "thin slightly",
    painting_phase: "basecoat",
    tool: "Size 1 brush",
    technique: "Layering",
    dilution: "1:1 water",
    time_estimate_minutes: 15,
    step_photo_path: "step1.jpg",
    alt_paint_id: 99,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 11,
    recipe_id: 1,
    paint_id: 6,
    step_name: "Shade",
    order_index: 1,
    notes: null,
    painting_phase: "shade",
    tool: null,
    technique: "Wash",
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
    created_at: "2026-01-01T00:00:00Z",
  },
];

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
  // First select: recipe rows; second select: step rows
  selectMock
    .mockResolvedValueOnce([RECIPE_FIXTURE])
    .mockResolvedValueOnce(STEP_FIXTURES);
  // First execute: recipe insert; subsequent: step inserts
  executeMock
    .mockResolvedValueOnce({ lastInsertId: 100 })
    .mockResolvedValue({ lastInsertId: 200 });
});

describe("duplicateRecipe — SQL coverage (STUDIO-03)", () => {
  it("reads original recipe via SELECT with $1 = originalId", async () => {
    await duplicateRecipe(1, "Copy of Space Marine Blue");
    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).toContain("painting_recipes");
    expect(sql).toContain("$1");
    expect(params[0]).toBe(1);
  });

  it("inserts recipe copy with newName as $1", async () => {
    await duplicateRecipe(1, "Copy of Space Marine Blue");
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toContain("INSERT INTO painting_recipes");
    expect(params[0]).toBe("Copy of Space Marine Blue");
  });

  it("reads original steps via SELECT WHERE recipe_id = $1", async () => {
    await duplicateRecipe(1, "Copy of Space Marine Blue");
    const [sql, params] = selectMock.mock.calls[1];
    expect(sql).toContain("recipe_steps");
    expect(sql).toContain("recipe_id = $1");
    expect(params[0]).toBe(1);
  });

  it("inserts step copies with newRecipeId as $1 and all 12 columns", async () => {
    await duplicateRecipe(1, "Copy of Space Marine Blue");
    // executeMock.calls[0] = recipe insert; [1] = first step; [2] = second step
    const [sql, params] = executeMock.mock.calls[1];
    expect(sql).toContain("INSERT INTO recipe_steps");
    expect(sql).toContain("step_photo_path");
    expect(sql).toContain("alt_paint_id");
    expect(sql).toContain("$12");
    expect(params[0]).toBe(100); // newRecipeId from lastInsertId
  });

  it("preserves order_index in step copies", async () => {
    await duplicateRecipe(1, "Copy of Space Marine Blue");
    const [, params1] = executeMock.mock.calls[1]; // first step
    const [, params2] = executeMock.mock.calls[2]; // second step
    expect(params1[3]).toBe(0); // order_index of first step
    expect(params2[3]).toBe(1); // order_index of second step
  });

  it("copies step_photo_path and alt_paint_id from original steps", async () => {
    await duplicateRecipe(1, "Copy of Space Marine Blue");
    const [, params1] = executeMock.mock.calls[1]; // first step
    const [, params2] = executeMock.mock.calls[2]; // second step
    expect(params1[10]).toBe("step1.jpg"); // $11 step_photo_path
    expect(params1[11]).toBe(99);           // $12 alt_paint_id
    expect(params2[10]).toBeNull();         // $11 step_photo_path null
    expect(params2[11]).toBeNull();         // $12 alt_paint_id null
  });

  it("returns the new recipe ID from lastInsertId", async () => {
    const newId = await duplicateRecipe(1, "Copy of Space Marine Blue");
    expect(newId).toBe(100);
  });

  it("throws Error('Recipe not found') when original does not exist", async () => {
    selectMock.mockReset();
    selectMock.mockResolvedValueOnce([]); // no recipe found
    await expect(duplicateRecipe(999, "Ghost Recipe")).rejects.toThrow("Recipe not found");
  });
});
