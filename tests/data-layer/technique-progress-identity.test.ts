// @vitest-environment node

/**
 * FND-03 invariant test: technique progress identity lock.
 *
 * Proves that adding, removing, or reordering a materialised technique step
 * never silently moves or orphans an existing step-completion marker —
 * the v0.2.13 "completed step jumps" class of bug must not recur.
 *
 * Decision D-09 (CONTEXT.md): the production resyncTechniqueInstance lands in
 * Phase 144; this test exercises the schema/SQL invariant DIRECTLY via the
 * better-sqlite3 harness, running exactly the SQL operations the future resync
 * will perform.
 *
 * Decision D-10 (CONTEXT.md): single db handle, flat inline SQL, no nested
 * BEGIN — identical to the saveRecipeGraph auto-commit/WAL pattern (FND-05).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import {
  createHobbyforgeDb,
  createTestFaction,
  createTestUnit,
  createTestRecipe,
  createTestSection,
} from "./db-helpers";

// ── Module-scoped vars assigned in beforeEach ────────────────────────────────

let db: Database.Database;

// Technique structure
let techniqueId: number;
let techniqueSectionId: number;
let colourSlotId: number;
let s1Id: number; // technique_steps ids
let s2Id: number;
let s3Id: number;

// Recipe structure
let recipeId: number;
let instanceId: number;
let sectionId: number; // recipe_sections id (with technique_instance_id = instanceId)

// Materialised recipe_steps PKs
let s1RecipeStepId: number;
let s2RecipeStepId: number; // S2's progress is recorded against this PK

// Assignment + progress
let assignmentId: number;

// ── Fixture builder ──────────────────────────────────────────────────────────

describe("technique progress identity (FND-03)", () => {
  beforeEach(() => {
    // FND-05: single db handle for the entire fixture + each test
    db = createHobbyforgeDb();

    // ── Step 1: technique + section + colour slot + 3 technique_steps ───────

    const techResult = db
      .prepare("INSERT INTO techniques (name) VALUES (?)")
      .run("OSL Glow");
    techniqueId = Number(techResult.lastInsertRowid);

    const tSectionResult = db
      .prepare(
        "INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Main Steps", 0);
    techniqueSectionId = Number(tSectionResult.lastInsertRowid);

    const slotResult = db
      .prepare(
        "INSERT INTO technique_colour_slots (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Glow Core", 0);
    colourSlotId = Number(slotResult.lastInsertRowid);

    // S1: order 0, no slot reference
    const s1Result = db
      .prepare(
        "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
      )
      .run(techniqueSectionId, null, "Basecoat", 0);
    s1Id = Number(s1Result.lastInsertRowid);

    // S2: order 1, references colour slot
    const s2Result = db
      .prepare(
        "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
      )
      .run(techniqueSectionId, colourSlotId, "Glow Layer", 1);
    s2Id = Number(s2Result.lastInsertRowid);

    // S3: order 2, no slot reference
    const s3Result = db
      .prepare(
        "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
      )
      .run(techniqueSectionId, null, "Highlight Edge", 2);
    s3Id = Number(s3Result.lastInsertRowid);

    // ── Step 2: recipe + recipe_technique_instances row ─────────────────────

    recipeId = createTestRecipe(db);

    const instanceResult = db
      .prepare(
        "INSERT INTO recipe_technique_instances (recipe_id, technique_id) VALUES (?, ?)",
      )
      .run(recipeId, techniqueId);
    instanceId = Number(instanceResult.lastInsertRowid);

    // ── Step 3: recipe_section with technique_instance_id + 3 materialised recipe_steps ──

    sectionId = createTestSection(db, recipeId, "OSL Steps");

    // Set technique_instance_id on the section
    db.prepare(
      "UPDATE recipe_sections SET technique_instance_id = ? WHERE id = ?",
    ).run(instanceId, sectionId);

    // Materialise S1, S2, S3 as recipe_steps (paint_id NULL, keyed by technique_step_id)
    const rs1Result = db
      .prepare(
        "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index, technique_step_id) VALUES (?, ?, NULL, ?, ?, ?)",
      )
      .run(recipeId, sectionId, "Basecoat", 0, s1Id);
    s1RecipeStepId = Number(rs1Result.lastInsertRowid);

    const rs2Result = db
      .prepare(
        "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index, technique_step_id) VALUES (?, ?, NULL, ?, ?, ?)",
      )
      .run(recipeId, sectionId, "Glow Layer", 1, s2Id);
    s2RecipeStepId = Number(rs2Result.lastInsertRowid);

    // S3's materialised recipe_step is inserted for the fixture; its PK is not
    // asserted directly (only S1/S2 progress identity is checked), so we do not
    // capture it.
    db
      .prepare(
        "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index, technique_step_id) VALUES (?, ?, NULL, ?, ?, ?)",
      )
      .run(recipeId, sectionId, "Highlight Edge", 2, s3Id);

    // ── Step 4: unit + assignment + progress marker on S2 ───────────────────

    const factionId = createTestFaction(db);
    const unitId = createTestUnit(db, factionId);

    const assignResult = db
      .prepare(
        "INSERT INTO unit_recipe_assignments (unit_id, recipe_id) VALUES (?, ?)",
      )
      .run(unitId, recipeId);
    assignmentId = Number(assignResult.lastInsertRowid);

    // Mark S2's materialised recipe_step as completed — record the recipe_step_id PK
    db.prepare(
      "INSERT INTO unit_recipe_step_progress (assignment_id, recipe_step_id, completed) VALUES (?, ?, 1)",
    ).run(assignmentId, s2RecipeStepId);
  });

  afterEach(() => {
    db.close();
  });

  // ── Smoke test: fixture integrity ─────────────────────────────────────────

  it("fixture: S2 progress row exists with completed=1 and the recorded recipe_step_id PK", () => {
    const row = db
      .prepare(
        "SELECT recipe_step_id, completed FROM unit_recipe_step_progress WHERE assignment_id = ? AND recipe_step_id = ?",
      )
      .get(assignmentId, s2RecipeStepId) as
      | { recipe_step_id: number; completed: number }
      | undefined;

    expect(row).toBeDefined();
    expect(row!.completed).toBe(1);
    expect(row!.recipe_step_id).toBe(s2RecipeStepId);
  });

  // ── Case 1: REORDER ───────────────────────────────────────────────────────

  it("reorder (S1↔S3 swap): S2 progress row keeps the same recipe_step_id PK and completed=1", () => {
    // Simulate the UPDATE-by-technique_step_id resync operation for a reorder.
    // This is the SAFE path: UPDATE in-place, never DELETE+re-INSERT.
    db.prepare(
      "UPDATE recipe_steps SET order_index = ? WHERE technique_step_id = ?",
    ).run(2, s1Id); // S1 gets S3's old position
    db.prepare(
      "UPDATE recipe_steps SET order_index = ? WHERE technique_step_id = ?",
    ).run(0, s3Id); // S3 gets S1's old position

    // Core assertion: S2's progress row is untouched — same PK, still completed
    const progress = db
      .prepare(
        "SELECT recipe_step_id, completed FROM unit_recipe_step_progress WHERE assignment_id = ? AND recipe_step_id = ?",
      )
      .get(assignmentId, s2RecipeStepId) as
      | { recipe_step_id: number; completed: number }
      | undefined;

    expect(progress).toBeDefined();
    expect(progress!.recipe_step_id).toBe(s2RecipeStepId);
    expect(progress!.completed).toBe(1);

    // Verify the reorder actually happened
    const s1Row = db
      .prepare(
        "SELECT order_index FROM recipe_steps WHERE technique_step_id = ?",
      )
      .get(s1Id) as { order_index: number } | undefined;
    const s3Row = db
      .prepare(
        "SELECT order_index FROM recipe_steps WHERE technique_step_id = ?",
      )
      .get(s3Id) as { order_index: number } | undefined;

    expect(s1Row!.order_index).toBe(2);
    expect(s3Row!.order_index).toBe(0);
  });

  // ── Case 2: ADD STEP S4 ───────────────────────────────────────────────────

  it("add step S4: new recipe_steps row has no progress marker; S2 progress untouched", () => {
    // Insert a new technique_step S4 into the technique
    const s4Result = db
      .prepare(
        "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
      )
      .run(techniqueSectionId, null, "Final Glaze", 3);
    const s4Id = Number(s4Result.lastInsertRowid);

    // Materialise S4 as a new recipe_steps row (what resync will do for a newly added step)
    const s4RecipeResult = db
      .prepare(
        "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index, technique_step_id) VALUES (?, ?, NULL, ?, ?, ?)",
      )
      .run(recipeId, sectionId, "Final Glaze", 3, s4Id);
    const s4RecipeStepId = Number(s4RecipeResult.lastInsertRowid);

    // New row must exist
    const newRow = db
      .prepare("SELECT id FROM recipe_steps WHERE id = ?")
      .get(s4RecipeStepId);
    expect(newRow).toBeDefined();

    // New row has NO progress marker (starts uncompleted by construction)
    const s4Progress = db
      .prepare(
        "SELECT id FROM unit_recipe_step_progress WHERE recipe_step_id = ?",
      )
      .get(s4RecipeStepId);
    expect(s4Progress).toBeUndefined();

    // S2 progress is untouched — same PK, still completed
    const s2Progress = db
      .prepare(
        "SELECT recipe_step_id, completed FROM unit_recipe_step_progress WHERE assignment_id = ? AND recipe_step_id = ?",
      )
      .get(assignmentId, s2RecipeStepId) as
      | { recipe_step_id: number; completed: number }
      | undefined;

    expect(s2Progress).toBeDefined();
    expect(s2Progress!.recipe_step_id).toBe(s2RecipeStepId);
    expect(s2Progress!.completed).toBe(1);
  });

  // ── Case 3: REMOVE STEP S1 ────────────────────────────────────────────────

  it("remove step S1: S1 recipe_step gone via CASCADE; S2 progress untouched; count drops by 1", () => {
    const beforeCount = (
      db
        .prepare("SELECT COUNT(*) as n FROM recipe_steps WHERE section_id = ?")
        .get(sectionId) as { n: number }
    ).n;
    expect(beforeCount).toBe(3);

    // DELETE S1's materialised row — its progress (if any) is gone via ON DELETE CASCADE
    db.prepare(
      "DELETE FROM recipe_steps WHERE technique_step_id = ?",
    ).run(s1Id);

    // S1's row is gone
    const s1Row = db
      .prepare("SELECT id FROM recipe_steps WHERE id = ?")
      .get(s1RecipeStepId);
    expect(s1Row).toBeUndefined();

    // Total count dropped by 1
    const afterCount = (
      db
        .prepare("SELECT COUNT(*) as n FROM recipe_steps WHERE section_id = ?")
        .get(sectionId) as { n: number }
    ).n;
    expect(afterCount).toBe(beforeCount - 1);

    // S2 progress row is untouched — same PK, still completed
    const s2Progress = db
      .prepare(
        "SELECT recipe_step_id, completed FROM unit_recipe_step_progress WHERE assignment_id = ? AND recipe_step_id = ?",
      )
      .get(assignmentId, s2RecipeStepId) as
      | { recipe_step_id: number; completed: number }
      | undefined;

    expect(s2Progress).toBeDefined();
    expect(s2Progress!.recipe_step_id).toBe(s2RecipeStepId);
    expect(s2Progress!.completed).toBe(1);
  });

  // ── Case 4: REMOVE SLOT ───────────────────────────────────────────────────

  it("remove slot: recipe_technique_slot_maps rows gone via CASCADE; technique_steps.colour_slot_id → NULL", () => {
    // Insert a slot_map row for the slot (paint_id NULL = unfilled, avoids paints FK)
    db.prepare(
      "INSERT INTO recipe_technique_slot_maps (instance_id, slot_id, paint_id) VALUES (?, ?, NULL)",
    ).run(instanceId, colourSlotId);

    // Verify slot_map row exists before deletion
    const mapsBefore = db
      .prepare(
        "SELECT COUNT(*) as n FROM recipe_technique_slot_maps WHERE slot_id = ?",
      )
      .get(colourSlotId) as { n: number };
    expect(mapsBefore.n).toBe(1);

    // DELETE the colour slot — triggers:
    //   ON DELETE CASCADE → recipe_technique_slot_maps rows for that slot gone
    //   ON DELETE SET NULL → technique_steps.colour_slot_id set to NULL
    db.prepare("DELETE FROM technique_colour_slots WHERE id = ?").run(
      colourSlotId,
    );

    // No dangling/orphan slot_map rows for the deleted slot
    const mapsAfter = db
      .prepare(
        "SELECT COUNT(*) as n FROM recipe_technique_slot_maps WHERE slot_id = ?",
      )
      .get(colourSlotId) as { n: number };
    expect(mapsAfter.n).toBe(0);

    // S2's technique_steps row now has colour_slot_id = NULL (SET NULL cascade)
    const s2Step = db
      .prepare("SELECT colour_slot_id FROM technique_steps WHERE id = ?")
      .get(s2Id) as { colour_slot_id: number | null } | undefined;

    expect(s2Step).toBeDefined();
    expect(s2Step!.colour_slot_id).toBeNull();
  });

  // ── Counter-case: DELETE+INSERT (the FORBIDDEN / BROKEN strategy) ─────────

  it("counter-case (teeth): DELETE+INSERT MOVES the progress marker — proves assertions are non-trivial", () => {
    // This counter-case simulates the FORBIDDEN resync strategy that the v0.2.13
    // "completed step jumps" regression used. Instead of UPDATE-by-technique_step_id
    // (which preserves the recipe_step_id PK), it DELETEs S2's materialised row and
    // re-INSERTs an equivalent row with the same technique_step_id = S2 but a FRESH
    // recipe_step_id (autoincrement). This is the BROKEN path the UPDATE path avoids.
    //
    // Expected outcome: the original progress row is CASCADE-deleted (the completion
    // is LOST), and the new recipe_steps row has NO progress marker.
    // This assertion would FAIL under the DELETE+INSERT path — proving the
    // invariant assertions in cases 1-4 are non-trivial and cannot pass trivially.

    // Record S2's original recipe_step PK before the destructive operation
    const originalS2RecipeStepId = s2RecipeStepId;

    // Verify the progress row exists before the counter-case operation
    const progressBefore = db
      .prepare(
        "SELECT id FROM unit_recipe_step_progress WHERE recipe_step_id = ?",
      )
      .get(originalS2RecipeStepId);
    expect(progressBefore).toBeDefined();

    // FORBIDDEN step 1: DELETE S2's materialised recipe_steps row.
    // ON DELETE CASCADE removes its unit_recipe_step_progress row — completion LOST.
    db.prepare("DELETE FROM recipe_steps WHERE id = ?").run(
      originalS2RecipeStepId,
    );

    // FORBIDDEN step 2: Re-INSERT an equivalent row with a NEW autoincrement PK.
    const newS2Result = db
      .prepare(
        "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index, technique_step_id) VALUES (?, ?, NULL, ?, ?, ?)",
      )
      .run(recipeId, sectionId, "Glow Layer", 1, s2Id);
    const newS2RecipeStepId = Number(newS2Result.lastInsertRowid);

    // The new recipe_steps row has a DIFFERENT PK
    expect(newS2RecipeStepId).not.toBe(originalS2RecipeStepId);

    // ASSERTION: the original progress is GONE — CASCADE deleted it
    const originalProgress = db
      .prepare(
        "SELECT id FROM unit_recipe_step_progress WHERE recipe_step_id = ?",
      )
      .get(originalS2RecipeStepId);
    expect(originalProgress).toBeUndefined(); // completion was LOST

    // ASSERTION: the new row has NO progress marker either — it starts uncompleted
    const newProgress = db
      .prepare(
        "SELECT id FROM unit_recipe_step_progress WHERE recipe_step_id = ?",
      )
      .get(newS2RecipeStepId);
    expect(newProgress).toBeUndefined(); // orphaned — the marker no longer points at the live step

    // Conclusion: DELETE+INSERT loses/moves the completion. The UPDATE-by-PK path
    // (cases 1-3) avoids this by never changing the recipe_step_id. This counter-case
    // proves those assertions cannot pass trivially.
  });
});
