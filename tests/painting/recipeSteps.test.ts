/**
 * RECIPE-05, RECIPE-06 — recipe step pure-function utilities.
 */
import { describe, it, expect } from "vitest";
import { computeOrderIndex, isPaintMissing, makeDraftStep } from "@/lib/recipeSteps";
import type { DraftStep } from "@/types/recipe";
import type { Paint } from "@/types/paint";

function step(over: Partial<DraftStep> = {}): DraftStep {
  return {
    localId: "x",
    dbId: null,
    step_name: "",
    paint_id: null,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
    ...over,
  };
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
      running_low: 0, wishlist: 0, notes: null, purchase_price_pence: null,
      purchase_date: null,
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
    expect(a.painting_phase).toBeNull();
    expect(a.time_estimate_minutes).toBeNull();
  });
  it("initializes dbId to null", () => {
    expect(makeDraftStep().dbId).toBeNull();
  });
});

describe("STEP-01/03/04 DraftStep new fields", () => {
  it("makeDraftStep initializes painting_phase to null", () => {
    expect(makeDraftStep().painting_phase).toBeNull();
  });
  it("makeDraftStep initializes tool to null", () => {
    expect(makeDraftStep().tool).toBeNull();
  });
  it("makeDraftStep initializes technique to null", () => {
    expect(makeDraftStep().technique).toBeNull();
  });
  it("makeDraftStep initializes dilution to null", () => {
    expect(makeDraftStep().dilution).toBeNull();
  });
  it("makeDraftStep initializes time_estimate_minutes to null", () => {
    expect(makeDraftStep().time_estimate_minutes).toBeNull();
  });
  it("makeDraftStep initializes step_photo_path to null", () => {
    expect(makeDraftStep().step_photo_path).toBeNull();
  });
  it("makeDraftStep initializes alt_paint_id to null", () => {
    expect(makeDraftStep().alt_paint_id).toBeNull();
  });
  it("computeOrderIndex preserves new fields through spread", () => {
    const input = step({
      localId: "z",
      painting_phase: "basecoat",
      tool: "Size 1 brush",
      time_estimate_minutes: 10,
      step_photo_path: "uuid.jpg",
      alt_paint_id: 5,
    });
    const result = computeOrderIndex([input]);
    expect(result[0].painting_phase).toBe("basecoat");
    expect(result[0].tool).toBe("Size 1 brush");
    expect(result[0].time_estimate_minutes).toBe(10);
    expect(result[0].step_photo_path).toBe("uuid.jpg");
    expect(result[0].alt_paint_id).toBe(5);
    expect(result[0].order_index).toBe(0);
  });
  it("computeOrderIndex preserves dbId through spread", () => {
    const input = step({ dbId: 42 });
    const result = computeOrderIndex([input]);
    expect(result[0].dbId).toBe(42);
  });
});
