// @vitest-environment node

/**
 * INTG-05 — Recipe duplication preserves the live link.
 *
 * Proves that duplicateRecipe produces a copy with:
 *   - Distinct recipe_technique_instances rows (new ids, same technique_id)
 *   - Independent recipe_technique_slot_maps (same slot→paint, distinct instance_id)
 *   - recipe_steps carrying technique_step_id (live link intact, not flattened)
 *   - recipe_sections pointing to the copy's technique instances (not the original's)
 *   - Original recipe's instances unchanged after duplication
 *
 * Written as a Wave 0 executable contract — proves integrity BEFORE any UI
 * surface (Phase 145+) depends on duplication behaviour.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type Database from "better-sqlite3";
import {
  createHobbyforgeDb,
  createTestRecipe,
  createDbBridge,
} from "./db-helpers";

vi.mock("@/db/client", () => ({ getDb: vi.fn() }));
import { getDb } from "@/db/client";

import { applyTechnique } from "@/db/queries/recipeTechniqueInstances";
import { duplicateRecipe } from "@/db/queries/recipes";

// ── Module-scoped vars assigned in beforeEach ────────────────────────────────

let db: Database.Database;
let recipeId: number;
let techniqueId: number;
let colourSlotId: number;
let techniqueStepId: number;
const FILL_PAINT_ID = 42;

// ── Fixture builder ──────────────────────────────────────────────────────────

describe("duplicateRecipe (INTG-05) — live-link preservation", () => {
  beforeEach(async () => {
    db = createHobbyforgeDb();

    // ── Technique with one section, one colour slot, one step ────────────────
    const techResult = db
      .prepare("INSERT INTO techniques (name) VALUES (?)")
      .run("OSL Gold");
    techniqueId = Number(techResult.lastInsertRowid);

    const tSectionResult = db
      .prepare(
        "INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Glow Layers", 0);
    const tSectionId = Number(tSectionResult.lastInsertRowid);

    const slotResult = db
      .prepare(
        "INSERT INTO technique_colour_slots (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "OSL Source", 0);
    colourSlotId = Number(slotResult.lastInsertRowid);

    const tStepResult = db
      .prepare(
        "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
      )
      .run(tSectionId, colourSlotId, "Apply OSL", 0);
    techniqueStepId = Number(tStepResult.lastInsertRowid);

    // ── Recipe ───────────────────────────────────────────────────────────────
    recipeId = createTestRecipe(db);

    // ── Seed paint used by slot fill FK ──────────────────────────────────────
    db.prepare(
      "INSERT OR IGNORE INTO paints (id, brand, name, paint_type) VALUES (?, 'Citadel', 'Yriel Yellow', 'Layer')",
    ).run(FILL_PAINT_ID);

    // ── Wire getDb() to the in-memory DB ─────────────────────────────────────
    vi.mocked(getDb).mockResolvedValue(createDbBridge(db) as never);

    // ── Apply technique with one filled slot ─────────────────────────────────
    await applyTechnique(recipeId, techniqueId, 0, new Map([[colourSlotId, FILL_PAINT_ID]]));
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  // ── Assertion 1: copy has distinct instances (new ids, same technique_id) ─

  it("copy has distinct recipe_technique_instances rows with new ids", async () => {
    const copyId = await duplicateRecipe(recipeId, "Copy Recipe");

    const origInstances = db
      .prepare("SELECT id, technique_id FROM recipe_technique_instances WHERE recipe_id = ?")
      .all(recipeId) as Array<{ id: number; technique_id: number }>;

    const copyInstances = db
      .prepare("SELECT id, technique_id FROM recipe_technique_instances WHERE recipe_id = ?")
      .all(copyId) as Array<{ id: number; technique_id: number }>;

    expect(origInstances.length).toBe(1);
    expect(copyInstances.length).toBe(1);

    // New instance id
    expect(copyInstances[0].id).not.toBe(origInstances[0].id);
    // Same technique_id (live link)
    expect(copyInstances[0].technique_id).toBe(origInstances[0].technique_id);
    expect(copyInstances[0].technique_id).toBe(techniqueId);
  });

  // ── Assertion 2: copy's slot maps are independent ─────────────────────────

  it("copy has independent slot maps with same slot→paint but distinct instance_id", async () => {
    const copyId = await duplicateRecipe(recipeId, "Copy Recipe");

    const origInstance = db
      .prepare("SELECT id FROM recipe_technique_instances WHERE recipe_id = ?")
      .get(recipeId) as { id: number };
    const copyInstance = db
      .prepare("SELECT id FROM recipe_technique_instances WHERE recipe_id = ?")
      .get(copyId) as { id: number };

    const origFill = db
      .prepare("SELECT * FROM recipe_technique_slot_maps WHERE instance_id = ?")
      .get(origInstance.id) as { instance_id: number; slot_id: number; paint_id: number } | undefined;
    const copyFill = db
      .prepare("SELECT * FROM recipe_technique_slot_maps WHERE instance_id = ?")
      .get(copyInstance.id) as { instance_id: number; slot_id: number; paint_id: number } | undefined;

    expect(origFill).toBeDefined();
    expect(copyFill).toBeDefined();

    // Same slot and paint values
    expect(copyFill!.slot_id).toBe(origFill!.slot_id);
    expect(copyFill!.paint_id).toBe(FILL_PAINT_ID);

    // But distinct instance_id — the copies are independent
    expect(copyFill!.instance_id).not.toBe(origFill!.instance_id);
    expect(copyFill!.instance_id).toBe(copyInstance.id);
  });

  // ── Assertion 3: copy's recipe_steps carry technique_step_id (live link intact) ─

  it("copy recipe_steps carry technique_step_id (live link not flattened)", async () => {
    const copyId = await duplicateRecipe(recipeId, "Copy Recipe");

    const copySteps = db
      .prepare(
        "SELECT technique_step_id, paint_id FROM recipe_steps WHERE recipe_id = ? AND technique_step_id IS NOT NULL",
      )
      .all(copyId) as Array<{ technique_step_id: number; paint_id: number | null }>;

    expect(copySteps.length).toBeGreaterThan(0);
    for (const step of copySteps) {
      // Live link preserved — technique_step_id still points to the technique step
      expect(step.technique_step_id).toBe(techniqueStepId);
      // paint_id is null on technique steps (filled via slot map, not direct paint_id)
      expect(step.paint_id).toBeNull();
    }
  });

  // ── Assertion 4: copy's sections point to copy's instances ───────────────

  it("copy recipe_sections point to copy's technique_instance_id, not original's", async () => {
    const copyId = await duplicateRecipe(recipeId, "Copy Recipe");

    const origInstance = db
      .prepare("SELECT id FROM recipe_technique_instances WHERE recipe_id = ?")
      .get(recipeId) as { id: number };
    const copyInstance = db
      .prepare("SELECT id FROM recipe_technique_instances WHERE recipe_id = ?")
      .get(copyId) as { id: number };

    const copySections = db
      .prepare(
        "SELECT technique_instance_id FROM recipe_sections WHERE recipe_id = ? AND technique_instance_id IS NOT NULL",
      )
      .all(copyId) as Array<{ technique_instance_id: number }>;

    expect(copySections.length).toBeGreaterThan(0);
    for (const section of copySections) {
      // Points to copy's instance, not original's
      expect(section.technique_instance_id).toBe(copyInstance.id);
      expect(section.technique_instance_id).not.toBe(origInstance.id);
    }
  });

  // ── Assertion 5: original recipe's instances are unchanged ───────────────

  it("original recipe's instances are unchanged after duplication", async () => {
    const origInstanceBefore = db
      .prepare("SELECT * FROM recipe_technique_instances WHERE recipe_id = ?")
      .get(recipeId) as { id: number; technique_id: number };

    await duplicateRecipe(recipeId, "Copy Recipe");

    const origInstanceAfter = db
      .prepare("SELECT * FROM recipe_technique_instances WHERE recipe_id = ?")
      .get(recipeId) as { id: number; technique_id: number };

    // Original instance is unmodified
    expect(origInstanceAfter.id).toBe(origInstanceBefore.id);
    expect(origInstanceAfter.technique_id).toBe(origInstanceBefore.technique_id);

    // Original slot map is unmodified
    const origFill = db
      .prepare("SELECT paint_id FROM recipe_technique_slot_maps WHERE instance_id = ?")
      .get(origInstanceAfter.id) as { paint_id: number } | undefined;
    expect(origFill).toBeDefined();
    expect(origFill!.paint_id).toBe(FILL_PAINT_ID);
  });
});
