// @vitest-environment node

/**
 * INTG-02 — effectivePaintId availability no-undercounting.
 *
 * Proves the honesty invariant at the resolver level:
 *   - A technique step with a filled slot resolves to the slot's paint (counts toward owned/missing)
 *   - A technique step with an unfilled slot resolves to null (NOT counted as missing)
 *   - A plain step (technique_step_id null) returns step.paint_id unchanged (FND-04 fallback)
 *
 * This distinguishes two types of "no paint":
 *   - Plain step with no paint: (step.paint_id = null, technique_step_id = null) → intentional, no paint needed
 *   - Technique step with unfilled slot: resolves to null but is known to be "missing a fill"
 *
 * Wave 0 — proves the resolver before any UI availability check depends on it.
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
import { getSlotResolutionMap } from "@/db/queries/recipeTechniqueSlotMaps";
import { effectivePaintId } from "@/lib/effectivePaintId";

// ── Module-scoped vars ───────────────────────────────────────────────────────

let db: Database.Database;
let recipeId: number;
let techniqueId: number;
let filledSlotId: number;
let unfilledSlotId: number;
let filledStepTechniqueStepId: number;
let unfilledStepTechniqueStepId: number;

const FILLED_PAINT_ID = 201;
const PLAIN_PAINT_ID = 202;

// ── Fixture builder ──────────────────────────────────────────────────────────

describe("effectivePaintId (INTG-02) — no-undercounting at resolver level", () => {
  beforeEach(async () => {
    db = createHobbyforgeDb();

    // ── Technique with 2 colour slots: one will be filled, one won't ─────────
    const techResult = db
      .prepare("INSERT INTO techniques (name) VALUES (?)")
      .run("Two Slot Technique");
    techniqueId = Number(techResult.lastInsertRowid);

    const tSectionResult = db
      .prepare(
        "INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Steps", 0);
    const tSectionId = Number(tSectionResult.lastInsertRowid);

    const filledSlotResult = db
      .prepare(
        "INSERT INTO technique_colour_slots (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Filled Slot", 0);
    filledSlotId = Number(filledSlotResult.lastInsertRowid);

    const unfilledSlotResult = db
      .prepare(
        "INSERT INTO technique_colour_slots (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Unfilled Slot", 1);
    unfilledSlotId = Number(unfilledSlotResult.lastInsertRowid);

    const filledStepResult = db
      .prepare(
        "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
      )
      .run(tSectionId, filledSlotId, "Filled Step", 0);
    filledStepTechniqueStepId = Number(filledStepResult.lastInsertRowid);

    const unfilledStepResult = db
      .prepare(
        "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
      )
      .run(tSectionId, unfilledSlotId, "Unfilled Step", 1);
    unfilledStepTechniqueStepId = Number(unfilledStepResult.lastInsertRowid);

    // ── Recipe ────────────────────────────────────────────────────────────────
    recipeId = createTestRecipe(db);

    // ── Seed paints ───────────────────────────────────────────────────────────
    db.prepare(
      "INSERT OR IGNORE INTO paints (id, brand, name, paint_type) VALUES (?, 'Citadel', 'Abaddon Black', 'Base')",
    ).run(FILLED_PAINT_ID);
    db.prepare(
      "INSERT OR IGNORE INTO paints (id, brand, name, paint_type) VALUES (?, 'Citadel', 'Averland Sunset', 'Base')",
    ).run(PLAIN_PAINT_ID);

    // ── Wire getDb() ──────────────────────────────────────────────────────────
    vi.mocked(getDb).mockResolvedValue(createDbBridge(db) as never);

    // ── Apply technique: fill the first slot, leave the second unfilled ───────
    await applyTechnique(
      recipeId,
      techniqueId,
      0,
      new Map([[filledSlotId, FILLED_PAINT_ID]]),
      // unfilledSlotId not in the map → no map row at all
    );
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  // ── Case 1: Filled technique step resolves to slot's paint ───────────────

  it("resolves a filled technique step to the slot's paint id (counts toward owned/missing)", async () => {
    const slotMap = await getSlotResolutionMap(recipeId);

    // Find the recipe_step row for the filled technique step
    const filledRecipeStep = db
      .prepare(
        "SELECT rs.id FROM recipe_steps rs WHERE rs.recipe_id = ? AND rs.technique_step_id = ?",
      )
      .get(recipeId, filledStepTechniqueStepId) as { id: number } | undefined;
    expect(filledRecipeStep).toBeDefined();

    const step = {
      id: filledRecipeStep!.id,
      paint_id: null,  // technique steps always have paint_id = null
      technique_step_id: filledStepTechniqueStepId,
    };

    const resolved = effectivePaintId(step, slotMap);
    expect(resolved).toBe(FILLED_PAINT_ID);
  });

  // ── Case 2: Unfilled technique step resolves to null (NOT counted as missing) ─

  it("resolves an unfilled technique step to null (not counted as missing paint)", async () => {
    const slotMap = await getSlotResolutionMap(recipeId);

    // Find the recipe_step row for the unfilled technique step
    const unfilledRecipeStep = db
      .prepare(
        "SELECT rs.id FROM recipe_steps rs WHERE rs.recipe_id = ? AND rs.technique_step_id = ?",
      )
      .get(recipeId, unfilledStepTechniqueStepId) as { id: number } | undefined;
    expect(unfilledRecipeStep).toBeDefined();

    const step = {
      id: unfilledRecipeStep!.id,
      paint_id: null,
      technique_step_id: unfilledStepTechniqueStepId,
    };

    const resolved = effectivePaintId(step, slotMap);
    // Unfilled slot → null. This is NOT a missing paint — it's an unassigned slot.
    // The getUnfilledSlotCount query (INTG-06) handles counting these separately.
    expect(resolved).toBeNull();
  });

  // ── Case 3: Plain step returns step.paint_id unchanged (FND-04 fallback) ─

  it("returns step.paint_id unchanged for a plain step (FND-04 fallback)", async () => {
    const slotMap = await getSlotResolutionMap(recipeId);

    // Plain step — no technique_step_id, has a direct paint_id
    const plainStep = {
      id: 99999,  // arbitrary id not in slotMap
      paint_id: PLAIN_PAINT_ID,
      technique_step_id: null,
    };

    const resolved = effectivePaintId(plainStep, slotMap);
    expect(resolved).toBe(PLAIN_PAINT_ID);
  });

  // ── Case 4: Plain step with no paint resolves to null ────────────────────

  it("returns null for a plain step with no paint (not an undercounting scenario)", async () => {
    const slotMap = await getSlotResolutionMap(recipeId);

    const paintlessPlainStep = {
      id: 88888,
      paint_id: null,
      technique_step_id: null,
    };

    const resolved = effectivePaintId(paintlessPlainStep, slotMap);
    expect(resolved).toBeNull();
  });

  // ── Case 5: slotMap has correct size (one entry per technique step) ───────

  it("slotMap has one entry per materialised technique step", async () => {
    const slotMap = await getSlotResolutionMap(recipeId);

    // The technique has 2 steps applied → 2 entries in slotMap
    expect(slotMap.size).toBe(2);
  });

  // ── Case 6: Filled slot is in slotMap; unfilled slot entry has null value ─

  it("slotMap contains null for the unfilled slot entry", async () => {
    const slotMap = await getSlotResolutionMap(recipeId);

    const unfilledRecipeStep = db
      .prepare(
        "SELECT rs.id FROM recipe_steps rs WHERE rs.recipe_id = ? AND rs.technique_step_id = ?",
      )
      .get(recipeId, unfilledStepTechniqueStepId) as { id: number } | undefined;
    expect(unfilledRecipeStep).toBeDefined();

    // The unfilled step's slot has no map row → getSlotResolutionMap returns null for it
    expect(slotMap.get(unfilledRecipeStep!.id)).toBeNull();
  });
});
