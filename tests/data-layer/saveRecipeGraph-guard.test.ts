// @vitest-environment node

/**
 * SC#5 Guard proof: saveRecipeGraph must NEVER DELETE or UPDATE a recipe_steps
 * row whose technique_step_id IS NOT NULL.
 *
 * Wave 0 — these tests are RED until Task 2 adds the guard in recipes.ts.
 *
 * T-143-01 / T-143-02 threat mitigations are proven here before any UI depends
 * on the apply-technique flow.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type Database from "better-sqlite3";
import {
  createHobbyforgeDb,
  createTestRecipe,
  createTestSection,
  createDbBridge,
} from "./db-helpers";

// Mock @/db/client so saveRecipeGraph uses our in-memory DB
vi.mock("@/db/client", () => ({ getDb: vi.fn() }));
import { getDb } from "@/db/client";
import { saveRecipeGraph } from "@/db/queries/recipes";
import type { DraftSection } from "@/types/recipe";
import type { RecipeSection } from "@/types/recipeSection";
import type { RecipeStep } from "@/types/recipePaint";

// ── Module-scoped vars assigned in beforeEach ────────────────────────────────

let db: Database.Database;

let recipeId: number;

// Plain (non-technique) section + step
let plainSectionId: number;
let plainStepId: number;

// Technique-sourced section + materialised step
let techniqueSectionId: number;
let techniqueStepId: number;      // recipe_steps.id for the materialised step
let techniqueSourceStepId: number; // technique_steps.id (FK target)
let instanceId: number;

// ── Fixture builder ──────────────────────────────────────────────────────────

describe("saveRecipeGraph SC#5 guard (T-143-01, T-143-02)", () => {
  beforeEach(() => {
    db = createHobbyforgeDb();

    // ── Technique rows (needed for FK resolution) ────────────────────────────
    const techResult = db
      .prepare("INSERT INTO techniques (name) VALUES (?)")
      .run("OSL Glow");
    const techniqueId = Number(techResult.lastInsertRowid);

    const tSectionResult = db
      .prepare(
        "INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Main Steps", 0);
    const tSectionId = Number(tSectionResult.lastInsertRowid);

    const tStepResult = db
      .prepare(
        "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
      )
      .run(tSectionId, null, "Glow Basecoat", 0);
    techniqueSourceStepId = Number(tStepResult.lastInsertRowid);

    // ── Recipe ───────────────────────────────────────────────────────────────
    recipeId = createTestRecipe(db);

    // ── recipe_technique_instances row ───────────────────────────────────────
    const instanceResult = db
      .prepare(
        "INSERT INTO recipe_technique_instances (recipe_id, technique_id) VALUES (?, ?)",
      )
      .run(recipeId, techniqueId);
    instanceId = Number(instanceResult.lastInsertRowid);

    // ── Plain section + plain step ────────────────────────────────────────────
    plainSectionId = createTestSection(db, recipeId, "Plain Steps");
    const plainStepResult = db
      .prepare(
        "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index) VALUES (?, ?, NULL, ?, ?)",
      )
      .run(recipeId, plainSectionId, "Base Coat", 0);
    plainStepId = Number(plainStepResult.lastInsertRowid);

    // ── Technique-sourced section (technique_instance_id set) ─────────────────
    techniqueSectionId = createTestSection(db, recipeId, "Technique Steps");
    db.prepare(
      "UPDATE recipe_sections SET technique_instance_id = ? WHERE id = ?",
    ).run(instanceId, techniqueSectionId);

    // ── Materialised recipe_step for the technique step ───────────────────────
    const tRecipeStepResult = db
      .prepare(
        "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index, technique_step_id) VALUES (?, ?, NULL, ?, ?, ?)",
      )
      .run(recipeId, techniqueSectionId, "Glow Basecoat", 0, techniqueSourceStepId);
    techniqueStepId = Number(tRecipeStepResult.lastInsertRowid);

    // Wire getDb() to our in-memory DB
    vi.mocked(getDb).mockResolvedValue(createDbBridge(db) as never);
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  // ── Helper: build RecipeSection[] from current DB rows ───────────────────

  function getExistingSections(): RecipeSection[] {
    return db
      .prepare("SELECT * FROM recipe_sections WHERE recipe_id = ? ORDER BY order_index")
      .all(recipeId) as RecipeSection[];
  }

  // ── Helper: build RecipeStep[] from current DB rows ──────────────────────

  function getExistingSteps(): RecipeStep[] {
    return db
      .prepare("SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY order_index")
      .all(recipeId) as RecipeStep[];
  }

  // ── Helper: build a minimal RecipeFormValues ─────────────────────────────

  function makeFormValues() {
    return {
      name: "Test Recipe",
      faction_id: null,
      unit_id: null,
      area: null,
      notes: null,
      tutorial_link: "",
      style: null,
      surface: null,
      effect: null,
      difficulty: null,
      estimated_minutes: null,
      result_photo_path: null,
    };
  }

  // ── Case 1: Never DELETEs a recipe_step with technique_step_id ───────────

  it("never DELETEs a recipe_step with technique_step_id IS NOT NULL (T-143-01)", async () => {
    // Draft sections: plain section with its plain step, but EXCLUDE the technique step
    // so computeStepDiff will mark it as toDelete. The guard must stop it being deleted.
    const draftSections: DraftSection[] = [
      {
        localId: "plain-sec",
        dbId: plainSectionId,
        name: "Plain Steps",
        surface: null,
        optional: 0,
        notes: null,
        section_type: null,
        technique: null,
        execution_mode: null,
        applies_to: null,
        steps: [
          {
            localId: "plain-step",
            dbId: plainStepId,
            step_name: "Base Coat",
            paint_id: null,
            notes: null,
            painting_phase: null,
            tool: null,
            technique: null,
            dilution: null,
            time_estimate_minutes: null,
            step_photo_path: null,
            alt_paint_id: null,
            technique_step_id: null,
          },
        ],
      },
      {
        localId: "tech-sec",
        dbId: techniqueSectionId,
        name: "Technique Steps",
        surface: null,
        optional: 0,
        notes: null,
        section_type: null,
        technique: null,
        execution_mode: null,
        applies_to: null,
        steps: [], // technique step excluded from draft
      },
    ];

    await saveRecipeGraph(
      recipeId,
      makeFormValues(),
      draftSections,
      getExistingSections(),
      getExistingSteps(),
    );

    // The technique-linked step must still be in the DB
    const count = (
      db
        .prepare("SELECT COUNT(*) as n FROM recipe_steps WHERE technique_step_id IS NOT NULL")
        .get() as { n: number }
    ).n;
    expect(count).toBe(1);

    // The specific row must still exist
    const row = db
      .prepare("SELECT id FROM recipe_steps WHERE id = ?")
      .get(techniqueStepId);
    expect(row).toBeDefined();
  });

  // ── Case 2: Never UPDATEs a recipe_step with technique_step_id ────────────

  it("never UPDATEs a recipe_step with technique_step_id IS NOT NULL (T-143-02)", async () => {
    // Read the original step_name for the technique step
    const originalRow = db
      .prepare("SELECT step_name FROM recipe_steps WHERE id = ?")
      .get(techniqueStepId) as { step_name: string } | undefined;
    expect(originalRow).toBeDefined();
    const originalName = originalRow!.step_name;

    // Draft includes the technique step with a CHANGED step_name.
    // The guard must prevent the UPDATE so the DB row remains unchanged.
    const draftSections: DraftSection[] = [
      {
        localId: "plain-sec",
        dbId: plainSectionId,
        name: "Plain Steps",
        surface: null,
        optional: 0,
        notes: null,
        section_type: null,
        technique: null,
        execution_mode: null,
        applies_to: null,
        steps: [
          {
            localId: "plain-step",
            dbId: plainStepId,
            step_name: "Base Coat",
            paint_id: null,
            notes: null,
            painting_phase: null,
            tool: null,
            technique: null,
            dilution: null,
            time_estimate_minutes: null,
            step_photo_path: null,
            alt_paint_id: null,
            technique_step_id: null,
          },
        ],
      },
      {
        localId: "tech-sec",
        dbId: techniqueSectionId,
        name: "Technique Steps",
        surface: null,
        optional: 0,
        notes: null,
        section_type: null,
        technique: null,
        execution_mode: null,
        applies_to: null,
        steps: [
          {
            localId: "tech-step",
            dbId: techniqueStepId,
            step_name: "MUTATED NAME — should be blocked",
            paint_id: null,
            notes: null,
            painting_phase: null,
            tool: null,
            technique: null,
            dilution: null,
            time_estimate_minutes: null,
            step_photo_path: null,
            alt_paint_id: null,
            technique_step_id: techniqueSourceStepId, // non-null — guard must fire
          },
        ],
      },
    ];

    await saveRecipeGraph(
      recipeId,
      makeFormValues(),
      draftSections,
      getExistingSections(),
      getExistingSteps(),
    );

    // DB row step_name must be UNCHANGED
    const afterRow = db
      .prepare("SELECT step_name FROM recipe_steps WHERE id = ?")
      .get(techniqueStepId) as { step_name: string } | undefined;
    expect(afterRow).toBeDefined();
    expect(afterRow!.step_name).toBe(originalName);
    expect(afterRow!.step_name).not.toBe("MUTATED NAME — should be blocked");
  });

  // ── Case 3: Still DELETEs plain recipe_steps normally ─────────────────────

  it("still DELETEs plain recipe_steps normally when excluded from draft", async () => {
    // Draft sections: exclude the plain step from the draft — it should be deleted.
    // The technique step is also excluded (no changes needed) — guard should protect it.
    const draftSections: DraftSection[] = [
      {
        localId: "plain-sec",
        dbId: plainSectionId,
        name: "Plain Steps",
        surface: null,
        optional: 0,
        notes: null,
        section_type: null,
        technique: null,
        execution_mode: null,
        applies_to: null,
        steps: [], // plain step excluded — should be deleted
      },
      {
        localId: "tech-sec",
        dbId: techniqueSectionId,
        name: "Technique Steps",
        surface: null,
        optional: 0,
        notes: null,
        section_type: null,
        technique: null,
        execution_mode: null,
        applies_to: null,
        steps: [], // technique step excluded — guard must protect it
      },
    ];

    await saveRecipeGraph(
      recipeId,
      makeFormValues(),
      draftSections,
      getExistingSections(),
      getExistingSteps(),
    );

    // Plain step must be gone
    const plainRow = db
      .prepare("SELECT id FROM recipe_steps WHERE id = ?")
      .get(plainStepId);
    expect(plainRow).toBeUndefined();

    // Technique step must still exist
    const techRow = db
      .prepare("SELECT id FROM recipe_steps WHERE id = ?")
      .get(techniqueStepId);
    expect(techRow).toBeDefined();
  });
});
