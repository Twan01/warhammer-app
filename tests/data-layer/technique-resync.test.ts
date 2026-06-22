// @vitest-environment node

/**
 * LINK-01 data-layer tests: resyncTechniqueInstances correctness.
 *
 * Covers all LINK-01 cases:
 *   reorder    — surviving recipe_step.id PK unchanged; order_index updated; progress untouched
 *   add        — new technique_step produces a new recipe_steps row (paint_id NULL, no progress)
 *   remove     — deleted technique_step causes recipe_steps DELETE; progress CASCADE-deletes
 *   slot       — deleting a colour slot cascades recipe_technique_slot_maps to 0 (no resync needed)
 *   multi      — two non-detached instances both receive the change; detached=1 instance is skipped
 *   cross-sec  — step moved between technique_sections keeps its recipe_steps.id and progress
 *   teeth      — DELETE+INSERT of a surviving step loses progress (counter-case proving UPDATE-by-PK is required)
 *
 * Uses better-sqlite3 directly — no Tauri bridge needed for pure SQL correctness proofs.
 * Calls resyncTechniqueInstances via createDbBridge (same pattern as apply-technique.test.ts).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type Database from "better-sqlite3";
import {
  createHobbyforgeDb,
  createTestRecipe,
  createTestFaction,
  createTestUnit,
  createTestSection,
  createDbBridge,
} from "./db-helpers";

// Mock @/db/client so resyncTechniqueInstances uses our in-memory DB
vi.mock("@/db/client", () => ({ getDb: vi.fn() }));
import { getDb } from "@/db/client";

// Import resyncTechniqueInstances — RED until Plan 01 Task 3 creates the module
import { resyncTechniqueInstances } from "@/db/queries/recipeTechniqueResync";

// ── Module-scoped vars assigned in beforeEach ──────────────────────────────

let db: Database.Database;

// Technique structure — single section, three steps
let techniqueId: number;
let techniqueSectionId: number;
let colourSlotId: number;
let s1Id: number; // technique_steps ids
let s2Id: number;
let s3Id: number;

// Primary recipe + instance
let recipeId: number;
let instanceId: number;
let sectionId: number; // recipe_sections id (technique_instance_id = instanceId)

// Materialised recipe_steps PKs (primary recipe)
let s1RecipeStepId: number;
let s2RecipeStepId: number;
let s3RecipeStepId: number;

// Assignment + progress (S2 is completed)
let assignmentId: number;

// Bridge handle — reused in test bodies
let bridge: ReturnType<typeof createDbBridge>;

// ── Fixture builder ────────────────────────────────────────────────────────

describe("resyncTechniqueInstances (LINK-01)", () => {
  beforeEach(() => {
    db = createHobbyforgeDb();

    // ── 1. Technique: one section, one colour slot, three steps ───────────

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

    // S1: order 0
    s1Id = Number(
      db
        .prepare(
          "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
        )
        .run(techniqueSectionId, null, "Basecoat", 0).lastInsertRowid,
    );

    // S2: order 1, references colour slot
    s2Id = Number(
      db
        .prepare(
          "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
        )
        .run(techniqueSectionId, colourSlotId, "Glow Layer", 1).lastInsertRowid,
    );

    // S3: order 2
    s3Id = Number(
      db
        .prepare(
          "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
        )
        .run(techniqueSectionId, null, "Highlight Edge", 2).lastInsertRowid,
    );

    // ── 2. Primary recipe + instance ──────────────────────────────────────

    recipeId = createTestRecipe(db);

    instanceId = Number(
      db
        .prepare(
          "INSERT INTO recipe_technique_instances (recipe_id, technique_id, detached) VALUES (?, ?, 0)",
        )
        .run(recipeId, techniqueId).lastInsertRowid,
    );

    // recipe_sections row: technique_instance_id + technique_section_id (migration 052)
    sectionId = createTestSection(db, recipeId, "OSL Steps");
    db.prepare(
      "UPDATE recipe_sections SET technique_instance_id = ?, technique_section_id = ? WHERE id = ?",
    ).run(instanceId, techniqueSectionId, sectionId);

    // Materialise S1, S2, S3 as recipe_steps (paint_id NULL, keyed by technique_step_id)
    s1RecipeStepId = Number(
      db
        .prepare(
          "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index, technique_step_id) VALUES (?, ?, NULL, ?, ?, ?)",
        )
        .run(recipeId, sectionId, "Basecoat", 0, s1Id).lastInsertRowid,
    );

    s2RecipeStepId = Number(
      db
        .prepare(
          "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index, technique_step_id) VALUES (?, ?, NULL, ?, ?, ?)",
        )
        .run(recipeId, sectionId, "Glow Layer", 1, s2Id).lastInsertRowid,
    );

    s3RecipeStepId = Number(
      db
        .prepare(
          "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index, technique_step_id) VALUES (?, ?, NULL, ?, ?, ?)",
        )
        .run(recipeId, sectionId, "Highlight Edge", 2, s3Id).lastInsertRowid,
    );

    // ── 3. Unit + assignment + progress on S2 ─────────────────────────────

    const factionId = createTestFaction(db);
    const unitId = createTestUnit(db, factionId);

    assignmentId = Number(
      db
        .prepare(
          "INSERT INTO unit_recipe_assignments (unit_id, recipe_id) VALUES (?, ?)",
        )
        .run(unitId, recipeId).lastInsertRowid,
    );

    // Mark S2 completed
    db.prepare(
      "INSERT INTO unit_recipe_step_progress (assignment_id, recipe_step_id, completed) VALUES (?, ?, 1)",
    ).run(assignmentId, s2RecipeStepId);

    // ── 4. Wire createDbBridge so resyncTechniqueInstances uses the in-memory DB

    bridge = createDbBridge(db);
    vi.mocked(getDb).mockResolvedValue(bridge as never);
  });

  afterEach(() => {
    db.close();
  });

  // ── Case 1: REORDER ───────────────────────────────────────────────────────

  it("reorder: surviving recipe_step.id unchanged; order_index updated; S2 progress untouched", async () => {
    // Simulate a technique edit: swap S1 (order 0) and S3 (order 2)
    db.prepare("UPDATE technique_steps SET order_index = ? WHERE id = ?").run(2, s1Id);
    db.prepare("UPDATE technique_steps SET order_index = ? WHERE id = ?").run(0, s3Id);

    await resyncTechniqueInstances(bridge, techniqueId);

    // S1's recipe_steps row must have updated order_index, but same PK
    const s1Row = db
      .prepare("SELECT id, order_index FROM recipe_steps WHERE id = ?")
      .get(s1RecipeStepId) as { id: number; order_index: number } | undefined;
    expect(s1Row).toBeDefined();
    expect(s1Row!.id).toBe(s1RecipeStepId); // PK unchanged
    expect(s1Row!.order_index).toBe(2);     // new order

    // S3 moved to position 0
    const s3Row = db
      .prepare("SELECT order_index FROM recipe_steps WHERE id = ?")
      .get(s3RecipeStepId) as { order_index: number } | undefined;
    expect(s3Row!.order_index).toBe(0);

    // S2 progress untouched
    const progress = db
      .prepare(
        "SELECT recipe_step_id, completed FROM unit_recipe_step_progress WHERE recipe_step_id = ?",
      )
      .get(s2RecipeStepId) as { recipe_step_id: number; completed: number } | undefined;
    expect(progress).toBeDefined();
    expect(progress!.recipe_step_id).toBe(s2RecipeStepId);
    expect(progress!.completed).toBe(1);
  });

  // ── Case 2: ADD ───────────────────────────────────────────────────────────

  it("add: new technique_step produces one new recipe_steps row (paint_id NULL, no progress)", async () => {
    // Insert a new technique_step S4
    const s4Id = Number(
      db
        .prepare(
          "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
        )
        .run(techniqueSectionId, null, "Final Glaze", 3).lastInsertRowid,
    );

    const beforeCount = (
      db
        .prepare("SELECT COUNT(*) AS n FROM recipe_steps WHERE section_id = ?")
        .get(sectionId) as { n: number }
    ).n;
    expect(beforeCount).toBe(3);

    await resyncTechniqueInstances(bridge, techniqueId);

    // One new row for S4
    const afterCount = (
      db
        .prepare("SELECT COUNT(*) AS n FROM recipe_steps WHERE section_id = ?")
        .get(sectionId) as { n: number }
    ).n;
    expect(afterCount).toBe(4);

    // The new row must have technique_step_id = s4Id and paint_id NULL
    const s4Row = db
      .prepare(
        "SELECT id, paint_id, technique_step_id FROM recipe_steps WHERE technique_step_id = ? AND section_id = ?",
      )
      .get(s4Id, sectionId) as { id: number; paint_id: number | null; technique_step_id: number } | undefined;
    expect(s4Row).toBeDefined();
    expect(s4Row!.paint_id).toBeNull();
    expect(s4Row!.technique_step_id).toBe(s4Id);

    // The new row must have zero progress rows
    const s4Progress = db
      .prepare("SELECT id FROM unit_recipe_step_progress WHERE recipe_step_id = ?")
      .get(s4Row!.id);
    expect(s4Progress).toBeUndefined();

    // S2 progress still intact
    const s2Progress = db
      .prepare(
        "SELECT completed FROM unit_recipe_step_progress WHERE recipe_step_id = ?",
      )
      .get(s2RecipeStepId) as { completed: number } | undefined;
    expect(s2Progress).toBeDefined();
    expect(s2Progress!.completed).toBe(1);
  });

  // ── Case 3: REMOVE ────────────────────────────────────────────────────────

  it("remove: deleted technique_step causes recipe_steps DELETE; progress CASCADE-deletes; S2 progress untouched", async () => {
    // Delete S1 from the technique (resync must then DELETE the recipe_steps row for S1)
    db.prepare("DELETE FROM technique_steps WHERE id = ?").run(s1Id);
    // technique_steps ON DELETE SET NULL → recipe_steps.technique_step_id becomes NULL;
    // the explicit resync DELETE will use technique_step_id IS NULL path or we handle via
    // the stored NULL. The resync must explicitly DELETE recipe_steps rows where the
    // technique_step_id is no longer in the technique.

    const beforeCount = (
      db
        .prepare("SELECT COUNT(*) AS n FROM recipe_steps WHERE section_id = ?")
        .get(sectionId) as { n: number }
    ).n;
    expect(beforeCount).toBe(3);

    await resyncTechniqueInstances(bridge, techniqueId);

    // S1's recipe_steps row must be gone
    const s1Row = db
      .prepare("SELECT id FROM recipe_steps WHERE id = ?")
      .get(s1RecipeStepId);
    expect(s1Row).toBeUndefined();

    // Count dropped by 1
    const afterCount = (
      db
        .prepare("SELECT COUNT(*) AS n FROM recipe_steps WHERE section_id = ?")
        .get(sectionId) as { n: number }
    ).n;
    expect(afterCount).toBe(beforeCount - 1);

    // S1 has no progress (was not completed in fixture), confirm no orphan rows
    const s1Progress = db
      .prepare("SELECT id FROM unit_recipe_step_progress WHERE recipe_step_id = ?")
      .get(s1RecipeStepId);
    expect(s1Progress).toBeUndefined();

    // S2 progress untouched
    const s2Progress = db
      .prepare(
        "SELECT recipe_step_id, completed FROM unit_recipe_step_progress WHERE recipe_step_id = ?",
      )
      .get(s2RecipeStepId) as { recipe_step_id: number; completed: number } | undefined;
    expect(s2Progress).toBeDefined();
    expect(s2Progress!.completed).toBe(1);
  });

  // ── Case 4: SLOT REMOVE ───────────────────────────────────────────────────

  it("slot remove: deleting a colour_slot cascades recipe_technique_slot_maps to 0 (no resync needed)", async () => {
    // Insert a slot_map row so we can verify it vanishes
    db.prepare(
      "INSERT INTO recipe_technique_slot_maps (instance_id, slot_id, paint_id) VALUES (?, ?, NULL)",
    ).run(instanceId, colourSlotId);

    const mapsBefore = (
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM recipe_technique_slot_maps WHERE slot_id = ?",
        )
        .get(colourSlotId) as { n: number }
    ).n;
    expect(mapsBefore).toBe(1);

    // Delete the colour slot — ON DELETE CASCADE kills the slot_map rows
    db.prepare("DELETE FROM technique_colour_slots WHERE id = ?").run(colourSlotId);

    // No orphan slot_maps
    const mapsAfter = (
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM recipe_technique_slot_maps WHERE slot_id = ?",
        )
        .get(colourSlotId) as { n: number }
    ).n;
    expect(mapsAfter).toBe(0);

    // technique_steps.colour_slot_id for S2 should now be NULL (ON DELETE SET NULL)
    const s2Step = db
      .prepare("SELECT colour_slot_id FROM technique_steps WHERE id = ?")
      .get(s2Id) as { colour_slot_id: number | null } | undefined;
    expect(s2Step).toBeDefined();
    expect(s2Step!.colour_slot_id).toBeNull();
  });

  // ── Case 5: MULTI-RECIPE ──────────────────────────────────────────────────

  it("multi-recipe: two non-detached instances both updated; detached=1 instance skipped", async () => {
    // Create a second non-detached recipe + instance
    const recipeId2 = createTestRecipe(db);
    const instanceId2 = Number(
      db
        .prepare(
          "INSERT INTO recipe_technique_instances (recipe_id, technique_id, detached) VALUES (?, ?, 0)",
        )
        .run(recipeId2, techniqueId).lastInsertRowid,
    );
    const sectionId2 = createTestSection(db, recipeId2, "OSL Steps B");
    db.prepare(
      "UPDATE recipe_sections SET technique_instance_id = ?, technique_section_id = ? WHERE id = ?",
    ).run(instanceId2, techniqueSectionId, sectionId2);

    const rs1_r2 = Number(
      db
        .prepare(
          "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index, technique_step_id) VALUES (?, ?, NULL, ?, ?, ?)",
        )
        .run(recipeId2, sectionId2, "Basecoat", 0, s1Id).lastInsertRowid,
    );
    const rs2_r2 = Number(
      db
        .prepare(
          "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index, technique_step_id) VALUES (?, ?, NULL, ?, ?, ?)",
        )
        .run(recipeId2, sectionId2, "Glow Layer", 1, s2Id).lastInsertRowid,
    );
    db
      .prepare(
        "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index, technique_step_id) VALUES (?, ?, NULL, ?, ?, ?)",
      )
      .run(recipeId2, sectionId2, "Highlight Edge", 2, s3Id);

    // Create a detached=1 recipe + instance — must NOT be touched by resync
    const recipeId3 = createTestRecipe(db);
    const instanceId3 = Number(
      db
        .prepare(
          "INSERT INTO recipe_technique_instances (recipe_id, technique_id, detached) VALUES (?, ?, 1)",
        )
        .run(recipeId3, techniqueId).lastInsertRowid,
    );
    const sectionId3 = createTestSection(db, recipeId3, "OSL Steps C");
    db.prepare(
      "UPDATE recipe_sections SET technique_instance_id = ?, technique_section_id = ? WHERE id = ?",
    ).run(instanceId3, techniqueSectionId, sectionId3);

    // Insert original recipe_steps for detached instance (order_index 0)
    db
      .prepare(
        "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index, technique_step_id) VALUES (?, ?, NULL, ?, ?, ?)",
      )
      .run(recipeId3, sectionId3, "Basecoat", 0, s1Id);

    // Mutate technique: swap S1 and S3 order
    db.prepare("UPDATE technique_steps SET order_index = ? WHERE id = ?").run(2, s1Id);
    db.prepare("UPDATE technique_steps SET order_index = ? WHERE id = ?").run(0, s3Id);

    await resyncTechniqueInstances(bridge, techniqueId);

    // Recipe 1 (non-detached): S1 order_index updated
    const s1r1 = db
      .prepare("SELECT order_index FROM recipe_steps WHERE id = ?")
      .get(s1RecipeStepId) as { order_index: number } | undefined;
    expect(s1r1!.order_index).toBe(2);

    // Recipe 2 (non-detached): S1 order_index also updated
    const s1r2 = db
      .prepare("SELECT order_index FROM recipe_steps WHERE id = ?")
      .get(rs1_r2) as { order_index: number } | undefined;
    expect(s1r2!.order_index).toBe(2);

    // Recipe 3 (detached=1): S1's recipe_steps row must still have order_index = 0 (unchanged)
    const s1r3 = db
      .prepare(
        "SELECT order_index FROM recipe_steps WHERE section_id = ? AND technique_step_id = ?",
      )
      .get(sectionId3, s1Id) as { order_index: number } | undefined;
    expect(s1r3).toBeDefined();
    expect(s1r3!.order_index).toBe(0); // NOT updated — detached instance skipped

    void rs2_r2; // suppress unused warning — rs2_r2 exists for fixture completeness
  });

  // ── Case 6: CROSS-SECTION MOVE ────────────────────────────────────────────

  it("cross-section: step moved to new technique_section keeps recipe_steps.id and progress", async () => {
    // Add a second technique_section
    const techSectionId2 = Number(
      db
        .prepare(
          "INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)",
        )
        .run(techniqueId, "Second Section", 1).lastInsertRowid,
    );

    // Add a corresponding recipe_sections row for this second technique section
    const sectionId2Recipe = Number(
      db
        .prepare(
          "INSERT INTO recipe_sections (recipe_id, name, order_index, technique_instance_id, technique_section_id) VALUES (?, ?, ?, ?, ?)",
        )
        .run(recipeId, "Second OSL Section", 1, instanceId, techSectionId2).lastInsertRowid,
    );

    // Move S3 from techniqueSectionId → techSectionId2 (cross-section drag simulation)
    db.prepare(
      "UPDATE technique_steps SET technique_section_id = ?, order_index = ? WHERE id = ?",
    ).run(techSectionId2, 0, s3Id);

    // S3's recipe_step still points at sectionId (old section) — resync must UPDATE section_id
    const s3BeforeRow = db
      .prepare("SELECT section_id FROM recipe_steps WHERE id = ?")
      .get(s3RecipeStepId) as { section_id: number } | undefined;
    expect(s3BeforeRow!.section_id).toBe(sectionId); // still old section

    await resyncTechniqueInstances(bridge, techniqueId);

    // S3's recipe_steps.id must be unchanged (UPDATE-by-PK, not DELETE+INSERT)
    const s3AfterRow = db
      .prepare("SELECT id, section_id, order_index FROM recipe_steps WHERE id = ?")
      .get(s3RecipeStepId) as { id: number; section_id: number; order_index: number } | undefined;
    expect(s3AfterRow).toBeDefined();
    expect(s3AfterRow!.id).toBe(s3RecipeStepId); // PK unchanged
    expect(s3AfterRow!.section_id).toBe(sectionId2Recipe); // moved to new section

    // S2 progress still intact
    const s2Progress = db
      .prepare(
        "SELECT completed FROM unit_recipe_step_progress WHERE recipe_step_id = ?",
      )
      .get(s2RecipeStepId) as { completed: number } | undefined;
    expect(s2Progress).toBeDefined();
    expect(s2Progress!.completed).toBe(1);

    void sectionId2Recipe; // suppress unused warning
  });

  // ── Case 7: TEETH COUNTER-CASE ───────────────────────────────────────────

  it("teeth counter-case: DELETE+INSERT of surviving step loses progress — proves UPDATE-by-PK is required", async () => {
    // This counter-case proves that the FORBIDDEN DELETE+INSERT path destroys progress.
    // It does NOT call resyncTechniqueInstances — it performs the forbidden operation
    // directly to assert the failure mode.

    const originalS2RecipeStepId = s2RecipeStepId;

    // Verify progress exists before
    const progressBefore = db
      .prepare("SELECT id FROM unit_recipe_step_progress WHERE recipe_step_id = ?")
      .get(originalS2RecipeStepId);
    expect(progressBefore).toBeDefined();

    // FORBIDDEN step 1: DELETE S2's recipe_steps row — CASCADE deletes progress
    db.prepare("DELETE FROM recipe_steps WHERE id = ?").run(originalS2RecipeStepId);

    // FORBIDDEN step 2: re-INSERT with same content but a FRESH autoincrement PK
    const newS2Result = db
      .prepare(
        "INSERT INTO recipe_steps (recipe_id, section_id, paint_id, step_name, order_index, technique_step_id) VALUES (?, ?, NULL, ?, ?, ?)",
      )
      .run(recipeId, sectionId, "Glow Layer", 1, s2Id);
    const newS2RecipeStepId = Number(newS2Result.lastInsertRowid);

    // New row has a different PK
    expect(newS2RecipeStepId).not.toBe(originalS2RecipeStepId);

    // ASSERTION: original progress is GONE (CASCADE deleted it)
    const originalProgress = db
      .prepare("SELECT id FROM unit_recipe_step_progress WHERE recipe_step_id = ?")
      .get(originalS2RecipeStepId);
    expect(originalProgress).toBeUndefined(); // completion LOST

    // ASSERTION: new row has NO progress (starts uncompleted)
    const newProgress = db
      .prepare("SELECT id FROM unit_recipe_step_progress WHERE recipe_step_id = ?")
      .get(newS2RecipeStepId);
    expect(newProgress).toBeUndefined(); // progress not restored

    // Conclusion: DELETE+INSERT loses the completion. The UPDATE-by-PK path (cases 1-6)
    // avoids this by preserving the recipe_step_id. This counter-case proves those
    // assertions cannot pass trivially under the forbidden strategy.
  });
});
