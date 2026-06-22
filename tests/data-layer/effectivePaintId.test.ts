/**
 * Pure unit tests for effectivePaintId (FND-04 / SLOT-05).
 *
 * No DB, no node environment directive needed.
 * effectivePaintId already exists (Phase 141) — these tests should be GREEN immediately.
 */

import { describe, it, expect } from "vitest";
import {
  effectivePaintId,
  type SlotResolutionMap,
  type PaintResolvableStep,
} from "@/lib/effectivePaintId";

describe("effectivePaintId (FND-04 / SLOT-05 pure unit)", () => {
  // ── Case 1: Filled technique step ────────────────────────────────────────

  it("filled technique step: returns the paint_id from the slot map", () => {
    const slotMap: SlotResolutionMap = new Map([[42, 7]]);
    const step: PaintResolvableStep = {
      paint_id: null,
      technique_step_id: 42,
    };
    expect(effectivePaintId(step, slotMap)).toBe(7);
  });

  // ── Case 2: Unfilled technique step (key present but null) ────────────────

  it("unfilled technique step (slot value = null): returns null (SLOT-05)", () => {
    const slotMap: SlotResolutionMap = new Map([[42, null]]);
    const step: PaintResolvableStep = {
      paint_id: null,
      technique_step_id: 42,
    };
    expect(effectivePaintId(step, slotMap)).toBeNull();
  });

  // ── Case 3: Unfilled technique step (key absent from map) ────────────────

  it("unfilled technique step (key missing from slot map): returns null (SLOT-05)", () => {
    const slotMap: SlotResolutionMap = new Map();
    const step: PaintResolvableStep = {
      paint_id: null,
      technique_step_id: 99,
    };
    expect(effectivePaintId(step, slotMap)).toBeNull();
  });

  // ── Case 4: Plain step (technique_step_id = null) ─────────────────────────

  it("plain step (technique_step_id = null): returns step.paint_id as-is", () => {
    const slotMap: SlotResolutionMap = new Map();
    const step: PaintResolvableStep = {
      paint_id: 15,
      technique_step_id: null,
    };
    expect(effectivePaintId(step, slotMap)).toBe(15);
  });

  // ── Case 5: Plain step (technique_step_id undefined) ─────────────────────

  it("plain step (technique_step_id undefined): returns step.paint_id as-is", () => {
    const slotMap: SlotResolutionMap = new Map();
    const step: PaintResolvableStep = {
      paint_id: 22,
    };
    expect(effectivePaintId(step, slotMap)).toBe(22);
  });

  // ── Case 6: Plain step with null paint_id ────────────────────────────────

  it("plain step with null paint_id: returns null", () => {
    const slotMap: SlotResolutionMap = new Map();
    const step: PaintResolvableStep = {
      paint_id: null,
      technique_step_id: undefined,
    };
    expect(effectivePaintId(step, slotMap)).toBeNull();
  });
});
