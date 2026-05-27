/**
 * DI-03 â€” saveRecipeGraph() SQL coverage: auto-commit per statement.
 * DI-04 â€” Existing section/step IDs preserved via diff-based approach.
 *
 * NOTE: saveRecipeGraph uses auto-commit mode (no explicit BEGIN/COMMIT/ROLLBACK)
 * because tauri-plugin-sql uses sqlx::Pool<Sqlite> â€” each db.execute() may run on
 * a different connection from the pool, so explicit transaction boundaries are broken.
 * In WAL mode, each committed write is immediately visible to all connections.
 *
 * Mocks getDb() to capture SQL strings and params.
 * Pure diff functions (computeSectionDiff, computeStepDiff, buildSectionIdMap) run with
 * real fixture data â€” no mocking needed for pure functions.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import { saveRecipeGraph } from "@/db/queries/recipes";
import type { DraftSection } from "@/features/recipes/recipeSection";
import type { RecipeSection } from "@/types/recipeSection";
import type { RecipeStep } from "@/types/recipePaint";
import type { RecipeFormValues } from "@/features/recipes/recipeSchema";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FORM_VALUES: RecipeFormValues = {
  name: "Test Recipe",
  faction_id: 1,
  unit_id: 2,
  area: "armour",
  notes: "test notes",
  tutorial_link: null,
  style: "Battle Ready",
  surface: "Armor",
  effect: null,
  difficulty: "Beginner",
  estimated_minutes: 60,
  result_photo_path: null,
};

/** Two draft sections: one existing (dbId = 10), one new (dbId = null) */
const DRAFT_SECTIONS: DraftSection[] = [
  {
    localId: "local-sec-1",
    dbId: 10,
    name: "Armour",
    surface: "smooth",
    optional: 0,
    notes: null,
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    steps: [
      {
        localId: "local-step-1",
        dbId: 100, // existing step
        step_name: "Basecoat",
        paint_id: 5,
        notes: "thin it",
        painting_phase: "basecoat",
        tool: null,
        technique: null,
        dilution: null,
        time_estimate_minutes: null,
        step_photo_path: null,
        alt_paint_id: null,
      },
      {
        localId: "local-step-2",
        dbId: null, // new step
        step_name: "Shade",
        paint_id: 6,
        notes: null,
        painting_phase: "shade",
        tool: null,
        technique: null,
        dilution: null,
        time_estimate_minutes: null,
        step_photo_path: null,
        alt_paint_id: null,
      },
    ],
  },
  {
    localId: "local-sec-2",
    dbId: null, // new section
    name: "Cloth",
    surface: null,
    optional: 1,
    notes: "optional",
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    steps: [
      {
        localId: "local-step-3",
        dbId: null, // new step in new section
        step_name: "Wash",
        paint_id: 7,
        notes: null,
        painting_phase: null,
        tool: null,
        technique: null,
        dilution: null,
        time_estimate_minutes: null,
        step_photo_path: null,
        alt_paint_id: null,
      },
    ],
  },
];

/** Existing DB sections (only section 10 survives in DRAFT_SECTIONS; section 11 is removed) */
const EXISTING_SECTIONS: RecipeSection[] = [
  {
    id: 10,
    recipe_id: 42,
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
    id: 11,
    recipe_id: 42,
    name: "OldSection",
    surface: null,
    optional: 0,
    order_index: 1,
    notes: null,
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

/** Existing DB steps (step 100 survives; step 101 belongs to removed section 11) */
const EXISTING_STEPS: RecipeStep[] = [
  {
    id: 100,
    recipe_id: 42,
    paint_id: 5,
    step_name: "Basecoat",
    order_index: 0,
    notes: "thin it",
    painting_phase: "basecoat",
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
    section_id: 10,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 101,
    recipe_id: 42,
    paint_id: 9,
    step_name: "OldStep",
    order_index: 0,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
    section_id: 11,
    created_at: "2026-01-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Tests: create path (recipeId === null)
// ---------------------------------------------------------------------------

describe("saveRecipeGraph â€” create path (recipeId = null)", () => {
  beforeEach(() => {
    selectMock.mockReset();
    executeMock.mockReset();
    // recipe INSERT, section 1 INSERT, section 2 INSERT, step INSERTs
    executeMock
      .mockResolvedValueOnce({ lastInsertId: 50 })   // recipe INSERT
      .mockResolvedValueOnce({ lastInsertId: 200 })  // section 1 INSERT (local-sec-1)
      .mockResolvedValueOnce({ lastInsertId: 201 })  // section 2 INSERT (local-sec-2)
      .mockResolvedValue({ lastInsertId: 300 });      // step INSERTs
  });

  it("does not issue BEGIN TRANSACTION (auto-commit mode for pool safety)", async () => {
    await saveRecipeGraph(null, FORM_VALUES, DRAFT_SECTIONS, [], []);
    const sqlCalls = executeMock.mock.calls.map(([sql]) => sql);
    expect(sqlCalls).not.toContain("BEGIN TRANSACTION");
    expect(sqlCalls).not.toContain("COMMIT");
    expect(sqlCalls).not.toContain("ROLLBACK");
  });

  it("inserts recipe row with all form values as $1...$21 as first call", async () => {
    await saveRecipeGraph(null, FORM_VALUES, DRAFT_SECTIONS, [], []);
    // calls[0] = recipe INSERT (no BEGIN before it)
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toContain("INSERT INTO painting_recipes");
    expect(sql).toContain("$21");
    expect(params[0]).toBe("Test Recipe");    // name = $1
    expect(params[1]).toBe(1);               // faction_id = $2
    expect(params[2]).toBe(2);               // unit_id = $3
  });

  it("returns the new recipe id from lastInsertId", async () => {
    const id = await saveRecipeGraph(null, FORM_VALUES, DRAFT_SECTIONS, [], []);
    expect(id).toBe(50);
  });

  it("inserts sections for all draft sections with recipe_id = new recipe id", async () => {
    await saveRecipeGraph(null, FORM_VALUES, DRAFT_SECTIONS, [], []);
    // calls[1] = section 1 INSERT; calls[2] = section 2 INSERT
    const [sql1, params1] = executeMock.mock.calls[1];
    expect(sql1).toContain("INSERT INTO recipe_sections");
    expect(params1[0]).toBe(50); // recipe_id
    expect(params1[1]).toBe("Armour"); // name

    const [, params2] = executeMock.mock.calls[2];
    expect(params2[0]).toBe(50);
    expect(params2[1]).toBe("Cloth");
    expect(params2[4]).toBe(1); // order_index = 1 for second section
  });

  it("inserts steps for each section using sectionIdMap-resolved section_id ($13)", async () => {
    await saveRecipeGraph(null, FORM_VALUES, DRAFT_SECTIONS, [], []);
    // calls[3] = step 1 in section 1; section 1 got id 200
    const [sql, params] = executeMock.mock.calls[3];
    expect(sql).toContain("INSERT INTO recipe_steps");
    expect(params[12]).toBe(200); // section_id = sectionIdMap.get("local-sec-1") = 200

    // calls[4] = step 2 in section 1; still section_id 200
    const [, params2] = executeMock.mock.calls[4];
    expect(params2[12]).toBe(200);

    // calls[5] = step in section 2; section 2 got id 201
    const [, params3] = executeMock.mock.calls[5];
    expect(params3[12]).toBe(201);
  });

  it("assigns correct per-section order_index to steps", async () => {
    await saveRecipeGraph(null, FORM_VALUES, DRAFT_SECTIONS, [], []);
    const [, params1] = executeMock.mock.calls[3]; // first step in section 1
    const [, params2] = executeMock.mock.calls[4]; // second step in section 1
    const [, params3] = executeMock.mock.calls[5]; // first step in section 2
    expect(params1[3]).toBe(0); // order_index
    expect(params2[3]).toBe(1); // order_index
    expect(params3[3]).toBe(0); // resets per section
  });

  it("does not issue COMMIT (auto-commit mode)", async () => {
    await saveRecipeGraph(null, FORM_VALUES, DRAFT_SECTIONS, [], []);
    const sqlCalls = executeMock.mock.calls.map(([sql]) => sql);
    expect(sqlCalls).not.toContain("COMMIT");
  });
});

// ---------------------------------------------------------------------------
// Tests: edit path (recipeId !== null)
// ---------------------------------------------------------------------------

describe("saveRecipeGraph â€” edit path (recipeId = 42)", () => {
  beforeEach(() => {
    selectMock.mockReset();
    executeMock.mockReset();
    // UPDATE recipe, DELETE removed section (11), UPDATE existing section (10),
    // INSERT new section (local-sec-2), DELETE removed step (101),
    // UPDATE existing step (100), INSERT new steps (local-step-2, local-step-3)
    executeMock.mockResolvedValue({ lastInsertId: 500 }); // default for all calls
  });

  it("does not issue BEGIN TRANSACTION (auto-commit mode for pool safety)", async () => {
    await saveRecipeGraph(42, FORM_VALUES, DRAFT_SECTIONS, EXISTING_SECTIONS, EXISTING_STEPS);
    const sqlCalls = executeMock.mock.calls.map(([sql]) => sql);
    expect(sqlCalls).not.toContain("BEGIN TRANSACTION");
    expect(sqlCalls).not.toContain("COMMIT");
    expect(sqlCalls).not.toContain("ROLLBACK");
  });

  it("updates recipe row with WHERE id = recipeId ($1) as first call", async () => {
    await saveRecipeGraph(42, FORM_VALUES, DRAFT_SECTIONS, EXISTING_SECTIONS, EXISTING_STEPS);
    // calls[0] = UPDATE recipe (no BEGIN before it)
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toContain("UPDATE painting_recipes");
    expect(params[0]).toBe(42); // $1 = recipeId
    expect(params[1]).toBe("Test Recipe"); // $2 = name
  });

  it("returns the existing recipe id unchanged", async () => {
    const id = await saveRecipeGraph(42, FORM_VALUES, DRAFT_SECTIONS, EXISTING_SECTIONS, EXISTING_STEPS);
    expect(id).toBe(42);
  });

  it("deletes removed sections (section 11 not in draft)", async () => {
    await saveRecipeGraph(42, FORM_VALUES, DRAFT_SECTIONS, EXISTING_SECTIONS, EXISTING_STEPS);
    const calls = executeMock.mock.calls;
    const deleteSectionCall = calls.find(
      ([sql, params]) =>
        typeof sql === "string" &&
        sql.includes("DELETE FROM recipe_sections") &&
        Array.isArray(params) &&
        params[0] === 11,
    );
    expect(deleteSectionCall).toBeDefined();
  });

  it("updates existing sections (section 10 in draft with dbId)", async () => {
    await saveRecipeGraph(42, FORM_VALUES, DRAFT_SECTIONS, EXISTING_SECTIONS, EXISTING_STEPS);
    const calls = executeMock.mock.calls;
    const updateSectionCall = calls.find(
      ([sql, params]) =>
        typeof sql === "string" &&
        sql.includes("UPDATE recipe_sections") &&
        Array.isArray(params) &&
        params[0] === 10,
    );
    expect(updateSectionCall).toBeDefined();
  });

  it("inserts new sections (local-sec-2 has dbId = null) and extends sectionIdMap", async () => {
    await saveRecipeGraph(42, FORM_VALUES, DRAFT_SECTIONS, EXISTING_SECTIONS, EXISTING_STEPS);
    const calls = executeMock.mock.calls;
    const insertSectionCall = calls.find(
      ([sql, params]) =>
        typeof sql === "string" &&
        sql.includes("INSERT INTO recipe_sections") &&
        Array.isArray(params) &&
        params[1] === "Cloth",
    );
    expect(insertSectionCall).toBeDefined();
  });

  it("deletes removed steps (step 101 not in any draft section)", async () => {
    await saveRecipeGraph(42, FORM_VALUES, DRAFT_SECTIONS, EXISTING_SECTIONS, EXISTING_STEPS);
    const calls = executeMock.mock.calls;
    const deleteStepCall = calls.find(
      ([sql, params]) =>
        typeof sql === "string" &&
        sql.includes("DELETE FROM recipe_steps") &&
        Array.isArray(params) &&
        params[0] === 101,
    );
    expect(deleteStepCall).toBeDefined();
  });

  it("updates existing steps (step 100 has dbId = 100)", async () => {
    await saveRecipeGraph(42, FORM_VALUES, DRAFT_SECTIONS, EXISTING_SECTIONS, EXISTING_STEPS);
    const calls = executeMock.mock.calls;
    const updateStepCall = calls.find(
      ([sql, params]) =>
        typeof sql === "string" &&
        sql.includes("UPDATE recipe_steps") &&
        Array.isArray(params) &&
        params[0] === 100,
    );
    expect(updateStepCall).toBeDefined();
  });

  it("inserts new steps (local-step-2 and local-step-3 have dbId = null)", async () => {
    await saveRecipeGraph(42, FORM_VALUES, DRAFT_SECTIONS, EXISTING_SECTIONS, EXISTING_STEPS);
    const calls = executeMock.mock.calls;
    // new steps are INSERTs with step_name "Shade" and "Wash"
    const insertStepCalls = calls.filter(
      ([sql]) => typeof sql === "string" && sql.includes("INSERT INTO recipe_steps"),
    );
    // No recipe INSERT in edit path, so all recipe_steps INSERTs are new steps
    const stepNames = insertStepCalls.flatMap(([, params]) =>
      Array.isArray(params) ? [params[2]] : [],
    );
    expect(stepNames).toContain("Shade");
    expect(stepNames).toContain("Wash");
  });

  it("uses sectionIdMap to assign section_id = 500 (lastInsertId) for steps in new section", async () => {
    await saveRecipeGraph(42, FORM_VALUES, DRAFT_SECTIONS, EXISTING_SECTIONS, EXISTING_STEPS);
    const calls = executeMock.mock.calls;
    // "Wash" step belongs to the new section (local-sec-2) which got lastInsertId = 500
    const washInsert = calls.find(
      ([sql, params]) =>
        typeof sql === "string" &&
        sql.includes("INSERT INTO recipe_steps") &&
        Array.isArray(params) &&
        params[2] === "Wash",
    );
    expect(washInsert).toBeDefined();
    // $13 = section_id = 500 (from new section insert)
    expect(washInsert![1][12]).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Tests: error propagation (no rollback in auto-commit mode)
// ---------------------------------------------------------------------------

describe("saveRecipeGraph â€” error propagation", () => {
  it("re-throws the error when a SQL operation fails (no ROLLBACK in auto-commit mode)", async () => {
    executeMock.mockReset();
    executeMock
      .mockResolvedValueOnce({ lastInsertId: 50 })   // recipe INSERT
      .mockRejectedValueOnce(new Error("FK violation")); // section INSERT fails

    await expect(
      saveRecipeGraph(null, FORM_VALUES, DRAFT_SECTIONS, [], []),
    ).rejects.toThrow("FK violation");

    const sqlCalls = executeMock.mock.calls.map(([sql]) => sql);
    expect(sqlCalls).not.toContain("BEGIN TRANSACTION");
    expect(sqlCalls).not.toContain("ROLLBACK");
    expect(sqlCalls).not.toContain("COMMIT");
  });

  it("re-throws the original error from recipe INSERT", async () => {
    executeMock.mockReset();
    executeMock
      .mockRejectedValueOnce(new Error("UNIQUE constraint failed"));

    await expect(
      saveRecipeGraph(null, FORM_VALUES, DRAFT_SECTIONS, [], []),
    ).rejects.toThrow("UNIQUE constraint failed");
  });

  it("re-throws error from edit path UPDATE recipe", async () => {
    executeMock.mockReset();
    executeMock
      .mockRejectedValueOnce(new Error("DB locked")); // UPDATE fails

    await expect(
      saveRecipeGraph(42, FORM_VALUES, DRAFT_SECTIONS, EXISTING_SECTIONS, EXISTING_STEPS),
    ).rejects.toThrow("DB locked");

    const sqlCalls = executeMock.mock.calls.map(([sql]) => sql);
    expect(sqlCalls).not.toContain("ROLLBACK");
    expect(sqlCalls).not.toContain("COMMIT");
  });
});
