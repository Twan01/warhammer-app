// @vitest-environment node

/**
 * CONTRACT for Plan 02 — RED until recipeTechniqueInstances.ts exists.
 *
 * SLOT-03: each instance's slot map is independent.
 * SLOT-04: applying the same technique twice creates two distinct instances.
 *
 * These assertions prove the apply-technique data-layer invariants BEFORE any UI
 * relies on them (Wave 0 executable contract).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type Database from "better-sqlite3";
import {
  createHobbyforgeDb,
  createTestRecipe,
  createDbBridge,
} from "./db-helpers";

// Mock @/db/client so applyTechnique uses our in-memory DB
vi.mock("@/db/client", () => ({ getDb: vi.fn() }));
import { getDb } from "@/db/client";

// Import applyTechnique — RED until Plan 02 creates recipeTechniqueInstances.ts
import { applyTechnique } from "@/db/queries/recipeTechniqueInstances";

// Import getSlotResolutionMap — for SLOT-04 resolution correctness test (CR-01)
import { getSlotResolutionMap } from "@/db/queries/recipeTechniqueSlotMaps";

// ── Module-scoped vars assigned in beforeEach ────────────────────────────────

let db: Database.Database;
let recipeId: number;
let techniqueId: number;
let colourSlotId: number;
let techniqueStepId: number; // technique_steps.id

// ── Fixture builder ──────────────────────────────────────────────────────────

describe("applyTechnique (SLOT-03, SLOT-04) — CONTRACT for Plan 02", () => {
  beforeEach(() => {
    db = createHobbyforgeDb();

    // ── Technique with one section, one colour slot, one step ────────────────
    const techResult = db
      .prepare("INSERT INTO techniques (name) VALUES (?)")
      .run("NMM Gold");
    techniqueId = Number(techResult.lastInsertRowid);

    const tSectionResult = db
      .prepare(
        "INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Layers", 0);
    const tSectionId = Number(tSectionResult.lastInsertRowid);

    const slotResult = db
      .prepare(
        "INSERT INTO technique_colour_slots (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Base Metal", 0);
    colourSlotId = Number(slotResult.lastInsertRowid);

    const tStepResult = db
      .prepare(
        "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
      )
      .run(tSectionId, colourSlotId, "Apply Base", 0);
    techniqueStepId = Number(tStepResult.lastInsertRowid);

    // ── Recipe ───────────────────────────────────────────────────────────────
    recipeId = createTestRecipe(db);

    // ── Seed paints used by slotFill tests (FK ON RESTRICT requires real rows) ─
    // Tests use paint ids 10, 20, 77 — insert them so FK constraint passes.
    for (const id of [10, 20, 77]) {
      db.prepare(
        "INSERT OR IGNORE INTO paints (id, brand, name, paint_type) VALUES (?, 'Test', 'TestPaint', 'Base')",
      ).run(id);
    }

    // Wire getDb() to our in-memory DB
    vi.mocked(getDb).mockResolvedValue(createDbBridge(db) as never);
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  // ── Case 1: Basic apply — one instance created ────────────────────────────

  it("creates exactly one recipe_technique_instances row", async () => {
    await applyTechnique(recipeId, techniqueId, 0, new Map());

    const count = (
      db
        .prepare("SELECT COUNT(*) as n FROM recipe_technique_instances WHERE recipe_id = ?")
        .get(recipeId) as { n: number }
    ).n;
    expect(count).toBe(1);
  });

  it("creates a recipe_sections row with technique_instance_id set", async () => {
    await applyTechnique(recipeId, techniqueId, 0, new Map());

    const instance = db
      .prepare("SELECT id FROM recipe_technique_instances WHERE recipe_id = ?")
      .get(recipeId) as { id: number } | undefined;
    expect(instance).toBeDefined();

    const section = db
      .prepare(
        "SELECT * FROM recipe_sections WHERE recipe_id = ? AND technique_instance_id = ?",
      )
      .get(recipeId, instance!.id) as { id: number; technique_instance_id: number } | undefined;
    expect(section).toBeDefined();
    expect(section!.technique_instance_id).toBe(instance!.id);
  });

  it("creates recipe_steps with technique_step_id set and paint_id IS NULL", async () => {
    await applyTechnique(recipeId, techniqueId, 0, new Map());

    const steps = db
      .prepare(
        "SELECT * FROM recipe_steps WHERE recipe_id = ? AND technique_step_id IS NOT NULL",
      )
      .all(recipeId) as Array<{ technique_step_id: number; paint_id: number | null }>;

    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) {
      expect(step.technique_step_id).toBe(techniqueStepId);
      expect(step.paint_id).toBeNull();
    }
  });

  it("creates recipe_technique_slot_maps rows matching the slotFills Map", async () => {
    const fillPaintId = 77;
    const slotFills = new Map([[colourSlotId, fillPaintId]]);

    await applyTechnique(recipeId, techniqueId, 0, slotFills);

    const instance = db
      .prepare("SELECT id FROM recipe_technique_instances WHERE recipe_id = ?")
      .get(recipeId) as { id: number } | undefined;
    expect(instance).toBeDefined();

    const slotMap = db
      .prepare(
        "SELECT * FROM recipe_technique_slot_maps WHERE instance_id = ? AND slot_id = ?",
      )
      .get(instance!.id, colourSlotId) as
      | { instance_id: number; slot_id: number; paint_id: number | null }
      | undefined;

    expect(slotMap).toBeDefined();
    expect(slotMap!.paint_id).toBe(fillPaintId);
  });

  // ── Case 2: SLOT-04 — two distinct instances for same (recipeId, techniqueId) ─

  it("SLOT-04: applying the same technique twice creates two distinct instance ids", async () => {
    const instanceAId = await applyTechnique(recipeId, techniqueId, 0, new Map());
    const instanceBId = await applyTechnique(recipeId, techniqueId, 1, new Map());

    expect(typeof instanceAId).toBe("number");
    expect(typeof instanceBId).toBe("number");
    expect(instanceAId).not.toBe(instanceBId);

    const count = (
      db
        .prepare("SELECT COUNT(*) as n FROM recipe_technique_instances WHERE recipe_id = ?")
        .get(recipeId) as { n: number }
    ).n;
    expect(count).toBe(2);
  });

  // ── Case 3: SLOT-03 — each instance's slot map is independent ────────────

  it("SLOT-03: filling instance B's slot does not change instance A's slot map", async () => {
    const paintA = 10;
    const paintB = 20;

    const instanceAId = await applyTechnique(
      recipeId,
      techniqueId,
      0,
      new Map([[colourSlotId, paintA]]),
    );
    const instanceBId = await applyTechnique(
      recipeId,
      techniqueId,
      1,
      new Map([[colourSlotId, paintB]]),
    );

    expect(instanceAId).not.toBe(instanceBId);

    const slotMapA = db
      .prepare(
        "SELECT paint_id FROM recipe_technique_slot_maps WHERE instance_id = ? AND slot_id = ?",
      )
      .get(instanceAId, colourSlotId) as { paint_id: number | null } | undefined;

    const slotMapB = db
      .prepare(
        "SELECT paint_id FROM recipe_technique_slot_maps WHERE instance_id = ? AND slot_id = ?",
      )
      .get(instanceBId, colourSlotId) as { paint_id: number | null } | undefined;

    // Instance A keeps its original fill
    expect(slotMapA).toBeDefined();
    expect(slotMapA!.paint_id).toBe(paintA);

    // Instance B has its own independent fill
    expect(slotMapB).toBeDefined();
    expect(slotMapB!.paint_id).toBe(paintB);
  });

  // ── Case 4: SLOT-04 — getSlotResolutionMap returns distinct paints per instance ─
  //
  // CR-01 fix verification: the resolution map is keyed on recipe_steps.id (not
  // technique_step_id), so two applications of the same technique in one recipe
  // each resolve to their own independently-filled slot. If this test was run
  // against the pre-fix code (keyed on technique_step_id), the second application's
  // paint would overwrite the first in the JS Map, and both steps would resolve to
  // the same (wrong) paint.

  it("SLOT-04 (CR-01): getSlotResolutionMap returns distinct paints for two instances of the same technique", async () => {
    const paintA = 10;
    const paintB = 20;

    await applyTechnique(recipeId, techniqueId, 0, new Map([[colourSlotId, paintA]]));
    await applyTechnique(recipeId, techniqueId, 1, new Map([[colourSlotId, paintB]]));

    // Load the resolution map — keyed on recipe_steps.id after CR-01 fix
    const resolutionMap = await getSlotResolutionMap(recipeId);

    // We expect two distinct recipe_step entries (one per application)
    expect(resolutionMap.size).toBe(2);

    // Retrieve the two recipe_steps rows to know which id belongs to which instance
    const recipeSteps = db
      .prepare(
        `SELECT rs.id, rsec.technique_instance_id
         FROM recipe_steps rs
         JOIN recipe_sections rsec ON rsec.id = rs.section_id
         WHERE rs.recipe_id = ? AND rs.technique_step_id IS NOT NULL
         ORDER BY rs.id ASC`,
      )
      .all(recipeId) as Array<{ id: number; technique_instance_id: number }>;

    expect(recipeSteps.length).toBe(2);

    // Each recipe_step resolves to its own instance's paint
    const [stepA, stepB] = recipeSteps;
    expect(resolutionMap.get(stepA.id)).toBe(paintA);
    expect(resolutionMap.get(stepB.id)).toBe(paintB);

    // Confirm the two steps belong to different instances
    expect(stepA.technique_instance_id).not.toBe(stepB.technique_instance_id);
  });
});
