/**
 * SECT-04/05/06 — recipeSections query module and hook contract coverage.
 *
 * Tests SQL assertions for all 6 query functions, the updated addRecipePaint
 * INSERT (section_id as $13), and type shape checks for RecipeSection and RecipeStep.
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const executeMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

// Import AFTER vi.mock so the mocked client is used
import {
  getRecipeSections,
  createRecipeSection,
  updateRecipeSection,
  deleteRecipeSection,
  reorderRecipeSections,
  getStepCountsBySection,
} from "@/db/queries/recipeSections";
import { addRecipePaint } from "@/db/queries/recipePaints";
import type { CreateRecipeSectionInput, UpdateRecipeSectionInput, RecipeSection } from "@/types/recipeSection";
import type { RecipeStep, CreateRecipeStepInput } from "@/types/recipePaint";

function makeStepInput(over: Partial<CreateRecipeStepInput> = {}): CreateRecipeStepInput {
  return {
    recipe_id: 1,
    paint_id: 2,
    step_name: "Basecoat",
    order_index: 0,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
    section_id: null,
    ...over,
  };
}

beforeEach(() => {
  executeMock.mockReset();
  selectMock.mockReset();
  executeMock.mockResolvedValue({ lastInsertId: 1 });
  selectMock.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// Group 1 — getRecipeSections (SECT-04 read)
// ---------------------------------------------------------------------------
describe("getRecipeSections — SECT-04 read", () => {
  it("queries recipe_sections filtered by recipe_id with correct order", async () => {
    await getRecipeSections(42);
    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).toContain("FROM recipe_sections WHERE recipe_id = $1");
    expect(sql).toContain("ORDER BY order_index ASC, id ASC");
    expect(params).toEqual([42]);
  });

  it("passes the caller's recipeId as the $1 param", async () => {
    await getRecipeSections(7);
    const [, params] = selectMock.mock.calls[0];
    expect(params[0]).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// Group 2 — createRecipeSection (SECT-04 create)
// ---------------------------------------------------------------------------
describe("createRecipeSection — SECT-04 create", () => {
  const input: CreateRecipeSectionInput = {
    recipe_id: 1,
    name: "Armour",
    surface: "Metal",
    optional: 0,
    order_index: 0,
    notes: "First pass",
  };

  it("INSERT contains all 6 column names and $1 through $6 placeholders", async () => {
    await createRecipeSection(input);
    const [sql] = executeMock.mock.calls[0];
    expect(sql).toContain("recipe_id");
    expect(sql).toContain("name");
    expect(sql).toContain("surface");
    expect(sql).toContain("optional");
    expect(sql).toContain("order_index");
    expect(sql).toContain("notes");
    expect(sql).toContain("$1");
    expect(sql).toContain("$2");
    expect(sql).toContain("$3");
    expect(sql).toContain("$4");
    expect(sql).toContain("$5");
    expect(sql).toContain("$6");
  });

  it("passes params in the correct positional order", async () => {
    await createRecipeSection(input);
    const [, params] = executeMock.mock.calls[0];
    expect(params[0]).toBe(1);          // $1 recipe_id
    expect(params[1]).toBe("Armour");   // $2 name
    expect(params[2]).toBe("Metal");    // $3 surface
    expect(params[3]).toBe(0);          // $4 optional
    expect(params[4]).toBe(0);          // $5 order_index
    expect(params[5]).toBe("First pass"); // $6 notes
  });

  it("applies null guards — surface and notes become null when not provided", async () => {
    await createRecipeSection({ ...input, surface: null, notes: null });
    const [, params] = executeMock.mock.calls[0];
    expect(params[2]).toBeNull(); // $3 surface
    expect(params[5]).toBeNull(); // $6 notes
  });

  it("returns lastInsertId from db.execute result", async () => {
    executeMock.mockResolvedValueOnce({ lastInsertId: 55 });
    const id = await createRecipeSection(input);
    expect(id).toBe(55);
  });
});

// ---------------------------------------------------------------------------
// Group 3 — updateRecipeSection (SECT-04 update)
// ---------------------------------------------------------------------------
describe("updateRecipeSection — SECT-04 update", () => {
  it("UPDATE uses COALESCE for name, optional, order_index and WHERE id = $1", async () => {
    const input: UpdateRecipeSectionInput = { id: 5, name: "Cloth" };
    await updateRecipeSection(input);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toContain("COALESCE($2, name)");
    expect(sql).toContain("COALESCE($4, optional)");
    expect(sql).toContain("COALESCE($5, order_index)");
    expect(sql).toContain("WHERE id = $1");
    expect(sql).toContain("updated_at = datetime('now')");
    expect(params[0]).toBe(5);
  });

  it("surface and notes use direct assignment (not COALESCE) to allow clearing", async () => {
    const input: UpdateRecipeSectionInput = { id: 3, surface: null, notes: null };
    await updateRecipeSection(input);
    const [sql] = executeMock.mock.calls[0];
    // surface and notes should NOT appear inside COALESCE
    expect(sql).not.toContain("COALESCE($3");
    expect(sql).not.toContain("COALESCE($6");
    // but they must appear as direct assignments
    expect(sql).toContain("surface = $3");
    expect(sql).toContain("notes = $6");
  });
});

// ---------------------------------------------------------------------------
// Group 4 — deleteRecipeSection (SECT-04 delete)
// ---------------------------------------------------------------------------
describe("deleteRecipeSection — SECT-04 delete", () => {
  it("executes DELETE FROM recipe_sections WHERE id = $1 with correct id", async () => {
    await deleteRecipeSection(7);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toContain("DELETE FROM recipe_sections WHERE id = $1");
    expect(params).toEqual([7]);
  });
});

// ---------------------------------------------------------------------------
// Group 5 — reorderRecipeSections (SECT-05)
// ---------------------------------------------------------------------------
describe("reorderRecipeSections — SECT-05", () => {
  it("calls db.execute once per section with correct order_index ($1) and id ($2)", async () => {
    const sections = [
      { id: 3, order_index: 0 },
      { id: 1, order_index: 1 },
      { id: 2, order_index: 2 },
    ];
    await reorderRecipeSections(sections);
    expect(executeMock).toHaveBeenCalledTimes(3);

    const [sql0, params0] = executeMock.mock.calls[0];
    expect(sql0).toContain("UPDATE recipe_sections SET order_index = $1");
    expect(params0).toEqual([0, 3]);

    const [, params1] = executeMock.mock.calls[1];
    expect(params1).toEqual([1, 1]);

    const [, params2] = executeMock.mock.calls[2];
    expect(params2).toEqual([2, 2]);
  });

  it("includes updated_at = datetime('now') in each UPDATE", async () => {
    await reorderRecipeSections([{ id: 1, order_index: 0 }]);
    const [sql] = executeMock.mock.calls[0];
    expect(sql).toContain("updated_at = datetime('now')");
  });
});

// ---------------------------------------------------------------------------
// Group 6 — getStepCountsBySection (SECT-06)
// ---------------------------------------------------------------------------
describe("getStepCountsBySection — SECT-06", () => {
  it("queries COUNT(*) AS step_count GROUP BY section_id WHERE section_id IS NOT NULL", async () => {
    await getStepCountsBySection();
    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).toContain("COUNT(*) AS step_count");
    expect(sql).toContain("WHERE section_id IS NOT NULL");
    expect(sql).toContain("GROUP BY section_id");
    expect(params).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Group 7 — addRecipePaint section_id support (SECT-02)
// ---------------------------------------------------------------------------
describe("addRecipePaint — section_id support (SECT-02)", () => {
  it("INSERT contains section_id column and $13 placeholder", async () => {
    await addRecipePaint(makeStepInput({ section_id: 99 }));
    const [sql] = executeMock.mock.calls[0];
    expect(sql).toContain("section_id");
    expect(sql).toContain("$13");
  });

  it("passes section_id as the 13th param (index 12)", async () => {
    await addRecipePaint(makeStepInput({ section_id: 99 }));
    const [, params] = executeMock.mock.calls[0];
    expect(params[12]).toBe(99);
  });

  it("null path: section_id null passes null as params[12]", async () => {
    await addRecipePaint(makeStepInput({ section_id: null }));
    const [, params] = executeMock.mock.calls[0];
    expect(params[12]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Group 8 — RecipeSection type shape (SECT-01)
// ---------------------------------------------------------------------------
describe("RecipeSection type shape — SECT-01", () => {
  it("interface has all 9 expected keys", () => {
    const section: RecipeSection = {
      id: 1,
      recipe_id: 2,
      name: "Armour",
      surface: "Metal",
      optional: 0,
      order_index: 0,
      notes: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    const keys = Object.keys(section);
    expect(keys).toContain("id");
    expect(keys).toContain("recipe_id");
    expect(keys).toContain("name");
    expect(keys).toContain("surface");
    expect(keys).toContain("optional");
    expect(keys).toContain("order_index");
    expect(keys).toContain("notes");
    expect(keys).toContain("created_at");
    expect(keys).toContain("updated_at");
    expect(keys).toHaveLength(9);
  });
});

// ---------------------------------------------------------------------------
// Group 9 — RecipeStep includes section_id (SECT-02)
// ---------------------------------------------------------------------------
describe("RecipeStep includes section_id — SECT-02", () => {
  it("section_id is a key in the RecipeStep interface and can be null", () => {
    const step: RecipeStep = {
      id: 1,
      recipe_id: 1,
      paint_id: 2,
      step_name: "Basecoat",
      order_index: 0,
      notes: null,
      painting_phase: null,
      tool: null,
      technique: null,
      dilution: null,
      time_estimate_minutes: null,
      step_photo_path: null,
      alt_paint_id: null,
      section_id: null,
      created_at: "2026-01-01T00:00:00Z",
    };
    expect("section_id" in step).toBe(true);
    expect(step.section_id).toBeNull();
  });

  it("section_id can be a number (assigned to a section)", () => {
    const step: RecipeStep = {
      id: 2,
      recipe_id: 1,
      paint_id: 3,
      step_name: "Shade",
      order_index: 1,
      notes: null,
      painting_phase: null,
      tool: null,
      technique: null,
      dilution: null,
      time_estimate_minutes: null,
      step_photo_path: null,
      alt_paint_id: null,
      section_id: 42,
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(step.section_id).toBe(42);
  });
});
