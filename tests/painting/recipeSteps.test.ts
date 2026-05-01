/**
 * RECIPE-05, RECIPE-06 — recipe step pure-function utilities.
 */
import { describe, it, expect } from "vitest";
import { computeOrderIndex, isPaintMissing, makeDraftStep, type DraftStep } from "@/features/recipes/recipeSteps";
import type { Paint } from "@/types/paint";

function step(over: Partial<DraftStep> = {}): DraftStep {
  return { localId: "x", step_name: "", paint_id: null, notes: null, ...over };
}

describe("RECIPE-05 computeOrderIndex", () => {
  it("returns [] for empty input", () => {
    expect(computeOrderIndex([])).toEqual([]);
  });
  it("assigns order_index 0..N-1 by array position", () => {
    const result = computeOrderIndex([
      step({ localId: "a", step_name: "Primer" }),
      step({ localId: "b", step_name: "Basecoat" }),
      step({ localId: "c", step_name: "Shade" }),
    ]);
    expect(result.map((s) => s.order_index)).toEqual([0, 1, 2]);
    expect(result.map((s) => s.localId)).toEqual(["a", "b", "c"]);
  });
  it("reflects array reorder in order_index", () => {
    const result = computeOrderIndex([
      step({ localId: "c" }),
      step({ localId: "a" }),
      step({ localId: "b" }),
    ]);
    expect(result.map((s) => `${s.localId}:${s.order_index}`)).toEqual(["c:0", "a:1", "b:2"]);
  });
});

describe("RECIPE-06 isPaintMissing", () => {
  function makePaint(over: Partial<Paint> = {}): Paint {
    return {
      id: 1, brand: "Citadel", name: "Abaddon Black", paint_type: "Base",
      color_family: null, hex_color: null, owned: 1, quantity: null,
      running_low: 0, wishlist: 0, notes: null,
      created_at: "2026-01-01", updated_at: "2026-01-01",
      ...over,
    };
  }
  it("returns true for null", () => {
    expect(isPaintMissing(null)).toBe(true);
  });
  it("returns true for undefined", () => {
    expect(isPaintMissing(undefined)).toBe(true);
  });
  it("returns true when paint.owned === 0", () => {
    expect(isPaintMissing(makePaint({ owned: 0 }))).toBe(true);
  });
  it("returns false when paint.owned === 1", () => {
    expect(isPaintMissing(makePaint({ owned: 1 }))).toBe(false);
  });
});

describe("makeDraftStep", () => {
  it("returns a fresh DraftStep with empty fields and a unique localId", () => {
    const a = makeDraftStep();
    const b = makeDraftStep();
    expect(a.localId).not.toBe(b.localId);
    expect(a.step_name).toBe("");
    expect(a.paint_id).toBeNull();
    expect(a.notes).toBeNull();
  });
});
