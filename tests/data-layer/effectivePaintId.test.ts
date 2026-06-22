/**
 * Pure unit tests for effectivePaintId (FND-04 / SLOT-05).
 *
 * No DB, no node environment directive needed.
 * effectivePaintId already exists (Phase 141) — these tests should be GREEN immediately.
 *
 * CR-01 update: SlotResolutionMap is now keyed by recipe_steps.id (not
 * technique_step_id). PaintResolvableStep now requires an `id` field.
 * Tests updated accordingly; SLOT-04 double-apply case added.
 */

import { describe, it, expect } from "vitest";
import {
  effectivePaintId,
  type SlotResolutionMap,
  type PaintResolvableStep,
} from "@/lib/effectivePaintId";

describe("effectivePaintId (FND-04 / SLOT-05 pure unit)", () => {
  // ── Case 1: Filled technique step ────────────────────────────────────────
  // Map is keyed by recipe_step.id (not technique_step_id).

  it("filled technique step: returns the paint_id from the slot map (keyed by recipe_step.id)", () => {
    // recipe_step.id = 101, technique_step_id = 42; map key = 101
    const slotMap: SlotResolutionMap = new Map([[101, 7]]);
    const step: PaintResolvableStep = {
      id: 101,
      paint_id: null,
      technique_step_id: 42,
    };
    expect(effectivePaintId(step, slotMap)).toBe(7);
  });

  // ── Case 2: Unfilled technique step (key present but null) ────────────────

  it("unfilled technique step (slot value = null): returns null (SLOT-05)", () => {
    const slotMap: SlotResolutionMap = new Map([[101, null]]);
    const step: PaintResolvableStep = {
      id: 101,
      paint_id: null,
      technique_step_id: 42,
    };
    expect(effectivePaintId(step, slotMap)).toBeNull();
  });

  // ── Case 3: Unfilled technique step (key absent from map) ────────────────

  it("unfilled technique step (key missing from slot map): returns null (SLOT-05)", () => {
    const slotMap: SlotResolutionMap = new Map();
    const step: PaintResolvableStep = {
      id: 999,
      paint_id: null,
      technique_step_id: 99,
    };
    expect(effectivePaintId(step, slotMap)).toBeNull();
  });

  // ── Case 4: Plain step (technique_step_id = null) ─────────────────────────

  it("plain step (technique_step_id = null): returns step.paint_id as-is", () => {
    const slotMap: SlotResolutionMap = new Map();
    const step: PaintResolvableStep = {
      id: 50,
      paint_id: 15,
      technique_step_id: null,
    };
    expect(effectivePaintId(step, slotMap)).toBe(15);
  });

  // ── Case 5: Plain step (technique_step_id undefined) ─────────────────────

  it("plain step (technique_step_id undefined): returns step.paint_id as-is", () => {
    const slotMap: SlotResolutionMap = new Map();
    const step: PaintResolvableStep = {
      id: 51,
      paint_id: 22,
    };
    expect(effectivePaintId(step, slotMap)).toBe(22);
  });

  // ── Case 6: Plain step with null paint_id ────────────────────────────────

  it("plain step with null paint_id: returns null", () => {
    const slotMap: SlotResolutionMap = new Map();
    const step: PaintResolvableStep = {
      id: 52,
      paint_id: null,
      technique_step_id: undefined,
    };
    expect(effectivePaintId(step, slotMap)).toBeNull();
  });

  // ── Case 7: SLOT-04 double-apply — two instances of the same technique ───
  //
  // When the same technique is applied twice, both applications share the same
  // technique_step_id values, but each application has its own recipe_steps rows
  // with distinct ids. The map must resolve each independently.

  it("SLOT-04: two applications of the same technique resolve to their own paints", () => {
    // Both steps have the same technique_step_id (42) but different recipe_step ids.
    // The map is keyed on recipe_step.id so each resolves to its own paint.
    const slotMap: SlotResolutionMap = new Map([
      [201, 10], // instance A's recipe_step → paint 10
      [202, 20], // instance B's recipe_step → paint 20
    ]);

    const stepA: PaintResolvableStep = {
      id: 201,
      paint_id: null,
      technique_step_id: 42, // same technique_step as stepB
    };
    const stepB: PaintResolvableStep = {
      id: 202,
      paint_id: null,
      technique_step_id: 42, // same technique_step as stepA
    };

    expect(effectivePaintId(stepA, slotMap)).toBe(10);
    expect(effectivePaintId(stepB, slotMap)).toBe(20);
  });
});
