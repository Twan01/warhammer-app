// @vitest-environment node

/**
 * SAFE-02 / SAFE-03 data-layer contract — RED until recipeTechniqueDetach.ts exists.
 *
 * Guard-first invariants (written before data-layer implementation, Phase 146):
 *   SC#3: surviving recipe_step.id unchanged after detach (progress preserved)
 *   SAFE-02: paint_id baked from slot map before slot maps are deleted
 *   SAFE-02: technique_step_id NULLed; recipe_sections FK columns NULLed
 *   SAFE-02: recipe_technique_instances row + slot_maps deleted
 *   SAFE-02: unfilled slot → paint_id baked as NULL (validly paintless)
 *   SAFE-02: manual user-added steps (technique_step_id IS NULL) untouched
 *   SAFE-03: detachAllAndDeleteTechnique auto-detaches all live instances then deletes technique
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type Database from "better-sqlite3";
import {
  createHobbyforgeDb,
  createTestRecipe,
  createDbBridge,
} from "./db-helpers";

// Mock @/db/client so functions use our in-memory DB
vi.mock("@/db/client", () => ({ getDb: vi.fn() }));
import { getDb } from "@/db/client";

import { applyTechnique } from "@/db/queries/recipeTechniqueInstances";
// RED: these imports fail until Task 2 creates recipeTechniqueDetach.ts
import {
  detachTechniqueInstance,
  detachAllAndDeleteTechnique,
} from "@/db/queries/recipeTechniqueDetach";

// ── Module-scoped vars assigned in beforeEach ──────────────────────────────

let db: Database.Database;
let recipeId: number;
let techniqueId: number;
let colourSlotId: number;
let techniqueStepId: number;
let paintId: number;
let instanceId: number;
let stepId: number; // the materialised recipe_steps.id (technique-owned step)

// ── SAFE-02: detachTechniqueInstance correctness ───────────────────────────

describe("detachTechniqueInstance (SAFE-02, SC#3)", () => {
  beforeEach(async () => {
    db = createHobbyforgeDb();

    // ── Technique: one section, one colour slot, one step ──────────────────
    const techResult = db
      .prepare("INSERT INTO techniques (name) VALUES (?)")
      .run("OSL Glow");
    techniqueId = Number(techResult.lastInsertRowid);

    const tSectionResult = db
      .prepare(
        "INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Glow Layer", 0);
    const tSectionId = Number(tSectionResult.lastInsertRowid);

    const slotResult = db
      .prepare(
        "INSERT INTO technique_colour_slots (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Glow Core", 0);
    colourSlotId = Number(slotResult.lastInsertRowid);

    const tStepResult = db
      .prepare(
        "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
      )
      .run(tSectionId, colourSlotId, "Apply Glow", 0);
    techniqueStepId = Number(tStepResult.lastInsertRowid);

    // ── Paint (FK target for slot fill) ───────────────────────────────────
    paintId = 42;
    db.prepare(
      "INSERT OR IGNORE INTO paints (id, brand, name, paint_type) VALUES (?, 'Test', 'Glow Yellow', 'Layer')",
    ).run(paintId);

    // ── Recipe ────────────────────────────────────────────────────────────
    recipeId = createTestRecipe(db);

    // Wire getDb() to our in-memory DB (needed by applyTechnique)
    vi.mocked(getDb).mockResolvedValue(createDbBridge(db) as never);

    // ── Apply technique with slot fill to materialise an instance ─────────
    instanceId = await applyTechnique(
      recipeId,
      techniqueId,
      0,
      new Map([[colourSlotId, paintId]]),
    );

    // Retrieve the materialised recipe_steps row id
    const stepRow = db
      .prepare(
        "SELECT id FROM recipe_steps WHERE recipe_id = ? AND technique_step_id IS NOT NULL",
      )
      .get(recipeId) as { id: number } | undefined;
    expect(stepRow).toBeDefined();
    stepId = stepRow!.id;

    // ── Insert unit_recipe_step_progress to prove SC#3 (FND-03 invariant) ─
    // Need a faction + unit + assignment for the FK chain
    const factionId = Number(
      db
        .prepare("INSERT INTO factions (name, game_system) VALUES (?, ?)")
        .run("Test Faction", "Warhammer 40K").lastInsertRowid,
    );
    const unitId = Number(
      db
        .prepare(
          "INSERT INTO units (faction_id, name, status_painting) VALUES (?, ?, ?)",
        )
        .run(factionId, "Test Marine", "Not Started").lastInsertRowid,
    );
    db.prepare(
      "INSERT INTO unit_recipe_step_progress (unit_id, recipe_step_id, completed) VALUES (?, ?, 1)",
    ).run(unitId, stepId);
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  // ── Test 1: Step row survives ──────────────────────────────────────────

  it("recipe_steps row survives detach with same id (SC#3)", async () => {
    const bridge = createDbBridge(db);
    await detachTechniqueInstance(bridge as never, instanceId);

    const step = db
      .prepare("SELECT id FROM recipe_steps WHERE id = ?")
      .get(stepId) as { id: number } | undefined;
    expect(step).toBeDefined();
    expect(step!.id).toBe(stepId);
  });

  // ── Test 2: technique_step_id NULLed ──────────────────────────────────

  it("technique_step_id is NULL after detach", async () => {
    const bridge = createDbBridge(db);
    await detachTechniqueInstance(bridge as never, instanceId);

    const step = db
      .prepare("SELECT technique_step_id FROM recipe_steps WHERE id = ?")
      .get(stepId) as { technique_step_id: number | null } | undefined;
    expect(step).toBeDefined();
    expect(step!.technique_step_id).toBeNull();
  });

  // ── Test 3: paint_id baked (not NULL) after detach ────────────────────

  it("paint_id baked to the resolved slot colour (not NULL) after detach", async () => {
    const bridge = createDbBridge(db);
    await detachTechniqueInstance(bridge as never, instanceId);

    const step = db
      .prepare("SELECT paint_id FROM recipe_steps WHERE id = ?")
      .get(stepId) as { paint_id: number | null } | undefined;
    expect(step).toBeDefined();
    expect(step!.paint_id).toBe(paintId);
  });

  // ── Test 4: progress row survives (FND-03) ────────────────────────────

  it("unit_recipe_step_progress row survives with completed = 1 after detach (FND-03)", async () => {
    const bridge = createDbBridge(db);
    await detachTechniqueInstance(bridge as never, instanceId);

    const progress = db
      .prepare(
        "SELECT completed FROM unit_recipe_step_progress WHERE recipe_step_id = ?",
      )
      .get(stepId) as { completed: number } | undefined;
    expect(progress).toBeDefined();
    expect(progress!.completed).toBe(1);
  });

  // ── Test 5: recipe_sections FK columns NULLed ─────────────────────────

  it("recipe_sections.technique_instance_id and technique_section_id are NULL after detach", async () => {
    const bridge = createDbBridge(db);
    await detachTechniqueInstance(bridge as never, instanceId);

    const section = db
      .prepare(
        "SELECT technique_instance_id, technique_section_id FROM recipe_sections WHERE recipe_id = ?",
      )
      .get(recipeId) as
      | { technique_instance_id: number | null; technique_section_id: number | null }
      | undefined;
    expect(section).toBeDefined();
    expect(section!.technique_instance_id).toBeNull();
    expect(section!.technique_section_id).toBeNull();
  });

  // ── Test 6: recipe_technique_instances row deleted ────────────────────

  it("recipe_technique_instances row is deleted after detach", async () => {
    const bridge = createDbBridge(db);
    await detachTechniqueInstance(bridge as never, instanceId);

    const inst = db
      .prepare("SELECT id FROM recipe_technique_instances WHERE id = ?")
      .get(instanceId) as { id: number } | undefined;
    expect(inst).toBeUndefined();
  });

  // ── Test 7: recipe_technique_slot_maps rows deleted ───────────────────

  it("recipe_technique_slot_maps rows for the instance are deleted after detach", async () => {
    const bridge = createDbBridge(db);
    await detachTechniqueInstance(bridge as never, instanceId);

    const slotMaps = db
      .prepare(
        "SELECT COUNT(*) as n FROM recipe_technique_slot_maps WHERE instance_id = ?",
      )
      .get(instanceId) as { n: number };
    expect(slotMaps.n).toBe(0);
  });

  // ── Test 8: recipe_steps row count unchanged ──────────────────────────

  it("recipe_steps row count is unchanged after detach (no rows deleted)", async () => {
    const countBefore = (
      db
        .prepare("SELECT COUNT(*) as n FROM recipe_steps WHERE recipe_id = ?")
        .get(recipeId) as { n: number }
    ).n;

    const bridge = createDbBridge(db);
    await detachTechniqueInstance(bridge as never, instanceId);

    const countAfter = (
      db
        .prepare("SELECT COUNT(*) as n FROM recipe_steps WHERE recipe_id = ?")
        .get(recipeId) as { n: number }
    ).n;

    expect(countAfter).toBe(countBefore);
  });

  // ── Test 9: unfilled slot bakes paint_id as NULL ──────────────────────

  it("unfilled slot bakes paint_id as NULL (step stays validly paintless)", async () => {
    // Apply a second time but with EMPTY slot fills (no paint chosen)
    const recipeId2 = createTestRecipe(db);
    const instanceId2 = await applyTechnique(recipeId2, techniqueId, 0, new Map());

    const stepRow2 = db
      .prepare(
        "SELECT id FROM recipe_steps WHERE recipe_id = ? AND technique_step_id IS NOT NULL",
      )
      .get(recipeId2) as { id: number } | undefined;
    expect(stepRow2).toBeDefined();
    const stepId2 = stepRow2!.id;

    const bridge = createDbBridge(db);
    await detachTechniqueInstance(bridge as never, instanceId2);

    const step = db
      .prepare("SELECT paint_id FROM recipe_steps WHERE id = ?")
      .get(stepId2) as { paint_id: number | null } | undefined;
    expect(step).toBeDefined();
    expect(step!.paint_id).toBeNull();
  });

  // ── Test 10: manual user-added step untouched ─────────────────────────

  it("manual user-added step (technique_step_id IS NULL, paint_id != NULL) is untouched by detach", async () => {
    // Retrieve the section for this instance
    const section = db
      .prepare(
        "SELECT id FROM recipe_sections WHERE recipe_id = ? AND technique_instance_id = ?",
      )
      .get(recipeId, instanceId) as { id: number } | undefined;
    expect(section).toBeDefined();
    const sectionId = section!.id;

    // Insert a plain step (manual) — no technique_step_id, has its own paint
    const manualPaintId = 99;
    db.prepare(
      "INSERT OR IGNORE INTO paints (id, brand, name, paint_type) VALUES (?, 'Test', 'Manual Paint', 'Base')",
    ).run(manualPaintId);

    const manualResult = db
      .prepare(
        "INSERT INTO recipe_steps (recipe_id, section_id, step_name, order_index, paint_id) VALUES (?, ?, ?, ?, ?)",
      )
      .run(recipeId, sectionId, "Manual Step", 99, manualPaintId);
    const manualStepId = Number(manualResult.lastInsertRowid);

    const bridge = createDbBridge(db);
    await detachTechniqueInstance(bridge as never, instanceId);

    const manualStep = db
      .prepare("SELECT technique_step_id, paint_id FROM recipe_steps WHERE id = ?")
      .get(manualStepId) as { technique_step_id: number | null; paint_id: number | null } | undefined;
    expect(manualStep).toBeDefined();
    expect(manualStep!.technique_step_id).toBeNull();
    expect(manualStep!.paint_id).toBe(manualPaintId);
  });
});

// ── SAFE-03: detachAllAndDeleteTechnique correctness ──────────────────────────

describe("detachAllAndDeleteTechnique (SAFE-03)", () => {
  beforeEach(async () => {
    db = createHobbyforgeDb();

    // ── Technique: one section, one colour slot, one step ──────────────────
    const techResult = db
      .prepare("INSERT INTO techniques (name) VALUES (?)")
      .run("NMM Gold");
    techniqueId = Number(techResult.lastInsertRowid);

    const tSectionResult = db
      .prepare(
        "INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Gold Layers", 0);
    const tSectionId = Number(tSectionResult.lastInsertRowid);

    const slotResult = db
      .prepare(
        "INSERT INTO technique_colour_slots (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Gold Base", 0);
    colourSlotId = Number(slotResult.lastInsertRowid);

    const tStepResult = db
      .prepare(
        "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
      )
      .run(tSectionId, colourSlotId, "Basecoat Gold", 0);
    techniqueStepId = Number(tStepResult.lastInsertRowid);

    // ── Paint ─────────────────────────────────────────────────────────────
    paintId = 55;
    db.prepare(
      "INSERT OR IGNORE INTO paints (id, brand, name, paint_type) VALUES (?, 'Test', 'Retributor Armour', 'Layer')",
    ).run(paintId);

    // ── Recipe ────────────────────────────────────────────────────────────
    recipeId = createTestRecipe(db);

    // Wire getDb() to our in-memory DB
    vi.mocked(getDb).mockResolvedValue(createDbBridge(db) as never);

    // ── Apply technique with slot fill ────────────────────────────────────
    instanceId = await applyTechnique(
      recipeId,
      techniqueId,
      0,
      new Map([[colourSlotId, paintId]]),
    );

    // Retrieve materialised step
    const stepRow = db
      .prepare(
        "SELECT id FROM recipe_steps WHERE recipe_id = ? AND technique_step_id IS NOT NULL",
      )
      .get(recipeId) as { id: number } | undefined;
    expect(stepRow).toBeDefined();
    stepId = stepRow!.id;

    // ── Insert progress ───────────────────────────────────────────────────
    const factionId = Number(
      db
        .prepare("INSERT INTO factions (name, game_system) VALUES (?, ?)")
        .run("Gold Faction", "Warhammer 40K").lastInsertRowid,
    );
    const unitId = Number(
      db
        .prepare(
          "INSERT INTO units (faction_id, name, status_painting) VALUES (?, ?, ?)",
        )
        .run(factionId, "Gold Marine", "Not Started").lastInsertRowid,
    );
    db.prepare(
      "INSERT INTO unit_recipe_step_progress (unit_id, recipe_step_id, completed) VALUES (?, ?, 1)",
    ).run(unitId, stepId);
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  it(
    "deleting a technique with one live instance bakes paint, removes the instance + technique, and keeps recipe section/step rows",
    async () => {
      await detachAllAndDeleteTechnique(techniqueId);

      // Technique row gone
      const tech = db
        .prepare("SELECT id FROM techniques WHERE id = ?")
        .get(techniqueId) as { id: number } | undefined;
      expect(tech).toBeUndefined();

      // recipe_steps row survives with baked paint_id
      const step = db
        .prepare("SELECT id, paint_id, technique_step_id FROM recipe_steps WHERE id = ?")
        .get(stepId) as
        | { id: number; paint_id: number | null; technique_step_id: number | null }
        | undefined;
      expect(step).toBeDefined();
      expect(step!.id).toBe(stepId);
      expect(step!.paint_id).toBe(paintId);
      expect(step!.technique_step_id).toBeNull();

      // recipe_sections survives with NULL technique_instance_id
      const section = db
        .prepare(
          "SELECT technique_instance_id FROM recipe_sections WHERE recipe_id = ?",
        )
        .get(recipeId) as { technique_instance_id: number | null } | undefined;
      expect(section).toBeDefined();
      expect(section!.technique_instance_id).toBeNull();

      // progress row survives (FND-03)
      const progress = db
        .prepare(
          "SELECT completed FROM unit_recipe_step_progress WHERE recipe_step_id = ?",
        )
        .get(stepId) as { completed: number } | undefined;
      expect(progress).toBeDefined();
      expect(progress!.completed).toBe(1);
    },
  );
});
