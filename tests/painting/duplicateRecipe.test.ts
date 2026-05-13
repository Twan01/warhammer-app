/**
 * STUDIO-03 — duplicateRecipe SQL coverage.
 * INTG-01 — section copy pass with Map<oldSectionId, newSectionId> remapping.
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
import type { RecipeSection } from "@/types/recipeSection";

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

const SECTION_FIXTURES: RecipeSection[] = [
  {
    id: 20,
    recipe_id: 1,
    name: "Armour",
    surface: "smooth",
    optional: 0,
    order_index: 0,
    notes: null,
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 21,
    recipe_id: 1,
    name: "Cloth",
    surface: null,
    optional: 1,
    order_index: 1,
    notes: "optional block",
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

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
    section_id: 20, // assigned to section "Armour" (old id 20 -> remapped to new id 200)
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
    section_id: null, // not assigned to a section — defensive path
    created_at: "2026-01-01T00:00:00Z",
  },
];

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
  // calls[0]: recipe; calls[1]: sections; calls[2]: steps
  selectMock
    .mockResolvedValueOnce([RECIPE_FIXTURE])  // calls[0]: recipe
    .mockResolvedValueOnce(SECTION_FIXTURES)  // calls[1]: sections
    .mockResolvedValueOnce(STEP_FIXTURES);    // calls[2]: steps
  // calls[0]: recipe INSERT (id 100); calls[1]: section 1 INSERT (id 200); calls[2]: section 2 INSERT (id 201); calls[3+]: step INSERTs
  executeMock
    .mockResolvedValueOnce({ lastInsertId: 100 }) // recipe INSERT
    .mockResolvedValueOnce({ lastInsertId: 200 }) // section 1 INSERT (old id 20 -> new id 200)
    .mockResolvedValueOnce({ lastInsertId: 201 }) // section 2 INSERT (old id 21 -> new id 201)
    .mockResolvedValue({ lastInsertId: 300 });     // step INSERTs
});

describe("duplicateRecipe — SQL coverage (STUDIO-03 + INTG-01)", () => {
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

  it("reads original sections via SELECT after recipe INSERT", async () => {
    await duplicateRecipe(1, "Copy of Space Marine Blue");
    const [sql, params] = selectMock.mock.calls[1];
    expect(sql).toContain("recipe_sections");
    expect(sql).toContain("recipe_id = $1");
    expect(params[0]).toBe(1);
  });

  it("inserts section copies with new recipe_id and all 10 columns including workflow metadata", async () => {
    await duplicateRecipe(1, "Copy of Space Marine Blue");
    // executeMock.calls[1] = section 1 INSERT; calls[2] = section 2 INSERT
    const [sql1, params1] = executeMock.mock.calls[1];
    expect(sql1).toContain("INSERT INTO recipe_sections");
    expect(sql1).toContain("section_type");
    expect(sql1).toContain("technique");
    expect(sql1).toContain("execution_mode");
    expect(sql1).toContain("applies_to");
    expect(params1).toEqual([100, "Armour", "smooth", 0, 0, null, null, null, null, null]);

    const [, params2] = executeMock.mock.calls[2];
    expect(params2).toEqual([100, "Cloth", null, 1, 1, "optional block", null, null, null, null]);
  });

  it("reads original steps with section-aware ordering via LEFT JOIN", async () => {
    await duplicateRecipe(1, "Copy of Space Marine Blue");
    const [sql, params] = selectMock.mock.calls[2];
    expect(sql).toContain("recipe_steps");
    expect(sql).toContain("LEFT JOIN recipe_sections s ON s.id = rs.section_id");
    expect(sql).toContain("COALESCE(s.order_index, 999999)");
    expect(sql).toContain("rs.recipe_id = $1");
    expect(params[0]).toBe(1);
  });

  it("inserts step copies with newRecipeId as $1 and all 13 columns including section_id", async () => {
    await duplicateRecipe(1, "Copy of Space Marine Blue");
    // executeMock.calls[3] = first step INSERT (after 1 recipe + 2 section INSERTs)
    const [sql, params] = executeMock.mock.calls[3];
    expect(sql).toContain("INSERT INTO recipe_steps");
    expect(sql).toContain("step_photo_path");
    expect(sql).toContain("alt_paint_id");
    expect(sql).toContain("section_id");
    expect(sql).toContain("$13");
    expect(params[0]).toBe(100); // newRecipeId from lastInsertId
  });

  it("remaps step section_id using sectionIdMap — old id 20 becomes new id 200", async () => {
    await duplicateRecipe(1, "Copy of Space Marine Blue");
    // calls[3] = first step (had section_id 20 -> remapped to 200)
    const [, params1] = executeMock.mock.calls[3];
    expect(params1[12]).toBe(200); // $13 section_id remapped

    // calls[4] = second step (had section_id null -> stays null)
    const [, params2] = executeMock.mock.calls[4];
    expect(params2[12]).toBeNull(); // $13 section_id preserved as null
  });

  it("preserves order_index in step copies", async () => {
    await duplicateRecipe(1, "Copy of Space Marine Blue");
    const [, params1] = executeMock.mock.calls[3]; // first step
    const [, params2] = executeMock.mock.calls[4]; // second step
    expect(params1[3]).toBe(0); // order_index of first step
    expect(params2[3]).toBe(1); // order_index of second step
  });

  it("copies step_photo_path and alt_paint_id from original steps", async () => {
    await duplicateRecipe(1, "Copy of Space Marine Blue");
    const [, params1] = executeMock.mock.calls[3]; // first step
    const [, params2] = executeMock.mock.calls[4]; // second step
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
