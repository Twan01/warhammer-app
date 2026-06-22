// @vitest-environment node

/**
 * INTG-06 — getUnfilledSlotCount correctness.
 *
 * Proves the honesty invariant: no silent undercounting.
 *   - Returns 0 for a recipe with no technique instances
 *   - Returns slot count when no slot maps exist (all unfilled)
 *   - Decrements as slots are filled; returns 0 when all slots filled
 *   - A slot-map row with paint_id NULL counts as unfilled
 *   - A detached instance's slots are excluded from the count (T-145-02)
 *
 * Wave 0 — written before any UI surface depends on this query.
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
import { getUnfilledSlotCount } from "@/db/queries/recipeTechniqueSlotMaps";

// ── Module-scoped vars ───────────────────────────────────────────────────────

let db: Database.Database;
let recipeId: number;
let techniqueId: number;
let colourSlotId1: number;
let colourSlotId2: number;

const PAINT_A = 101;
const PAINT_B = 102;

// ── Fixture builder ──────────────────────────────────────────────────────────

describe("getUnfilledSlotCount (INTG-06) — honesty invariant", () => {
  beforeEach(async () => {
    db = createHobbyforgeDb();

    // ── Technique with 2 colour slots ─────────────────────────────────────────
    const techResult = db
      .prepare("INSERT INTO techniques (name) VALUES (?)")
      .run("NMM Gold");
    techniqueId = Number(techResult.lastInsertRowid);

    const tSectionResult = db
      .prepare(
        "INSERT INTO technique_sections (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Base Layers", 0);
    const tSectionId = Number(tSectionResult.lastInsertRowid);

    const slot1Result = db
      .prepare(
        "INSERT INTO technique_colour_slots (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Base Metal", 0);
    colourSlotId1 = Number(slot1Result.lastInsertRowid);

    const slot2Result = db
      .prepare(
        "INSERT INTO technique_colour_slots (technique_id, name, order_index) VALUES (?, ?, ?)",
      )
      .run(techniqueId, "Highlight Metal", 1);
    colourSlotId2 = Number(slot2Result.lastInsertRowid);

    // ── Two technique steps (one per slot) ───────────────────────────────────
    db.prepare(
      "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
    ).run(tSectionId, colourSlotId1, "Apply Base Metal", 0);
    db.prepare(
      "INSERT INTO technique_steps (technique_section_id, colour_slot_id, step_name, order_index) VALUES (?, ?, ?, ?)",
    ).run(tSectionId, colourSlotId2, "Apply Highlight", 1);

    // ── Recipe ───────────────────────────────────────────────────────────────
    recipeId = createTestRecipe(db);

    // ── Seed paints ──────────────────────────────────────────────────────────
    for (const [id, name] of [[PAINT_A, "Leadbelcher"], [PAINT_B, "Runefang Steel"]] as const) {
      db.prepare(
        "INSERT OR IGNORE INTO paints (id, brand, name, paint_type) VALUES (?, 'Citadel', ?, 'Base')",
      ).run(id, name);
    }

    // ── Wire getDb() ─────────────────────────────────────────────────────────
    vi.mocked(getDb).mockResolvedValue(createDbBridge(db) as never);
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  // ── Case 1: No technique instances ───────────────────────────────────────

  it("returns 0 for a recipe with no technique instances", async () => {
    const count = await getUnfilledSlotCount(recipeId);
    expect(count).toBe(0);
  });

  // ── Case 2: Instance applied, no slot maps → all slots unfilled ──────────

  it("returns slot count when no slot maps exist (all unfilled)", async () => {
    await applyTechnique(recipeId, techniqueId, 0, new Map());

    const count = await getUnfilledSlotCount(recipeId);
    expect(count).toBe(2); // 2 colour slots, 0 filled
  });

  // ── Case 3: Partial fill → one slot still unfilled ───────────────────────

  it("decrements as slots are filled", async () => {
    await applyTechnique(recipeId, techniqueId, 0, new Map([[colourSlotId1, PAINT_A]]));

    const count = await getUnfilledSlotCount(recipeId);
    expect(count).toBe(1); // 2 slots, 1 filled
  });

  // ── Case 4: All slots filled → returns 0 ─────────────────────────────────

  it("returns 0 when all slots are filled", async () => {
    await applyTechnique(
      recipeId,
      techniqueId,
      0,
      new Map([
        [colourSlotId1, PAINT_A],
        [colourSlotId2, PAINT_B],
      ]),
    );

    const count = await getUnfilledSlotCount(recipeId);
    expect(count).toBe(0);
  });

  // ── Case 5: Explicit NULL slot map row → counts as unfilled ──────────────

  it("counts a slot-map row with paint_id NULL as unfilled", async () => {
    // Apply with one filled slot, one explicit null
    await applyTechnique(
      recipeId,
      techniqueId,
      0,
      new Map([
        [colourSlotId1, PAINT_A],
        [colourSlotId2, null],  // explicit null fill
      ]),
    );

    const count = await getUnfilledSlotCount(recipeId);
    expect(count).toBe(1); // slot2 has a row but paint_id IS NULL → unfilled
  });

  // ── Case 6: Detached instance excluded from count ────────────────────────

  it("excludes detached instances from the count", async () => {
    const instanceId = await applyTechnique(recipeId, techniqueId, 0, new Map());

    // Mark the instance as detached
    db.prepare("UPDATE recipe_technique_instances SET detached = 1 WHERE id = ?").run(instanceId);

    const count = await getUnfilledSlotCount(recipeId);
    expect(count).toBe(0); // detached instance excluded → no slots counted
  });

  // ── Case 7: Mixed detached/non-detached → only non-detached counted ──────

  it("counts only non-detached instances when both exist", async () => {
    const detachedId = await applyTechnique(recipeId, techniqueId, 0, new Map());
    // Apply a second instance (non-detached, no fills)
    await applyTechnique(recipeId, techniqueId, 1, new Map());

    // Detach the first instance
    db.prepare("UPDATE recipe_technique_instances SET detached = 1 WHERE id = ?").run(detachedId);

    const count = await getUnfilledSlotCount(recipeId);
    expect(count).toBe(2); // only the non-detached instance's 2 slots counted
  });
});
