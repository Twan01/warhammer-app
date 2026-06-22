import { describe, it, expect } from "vitest";
import { effectivePaintId } from "@/lib/effectivePaintId";

// CR-01 update: SlotResolutionMap is now keyed by recipe_steps.id (the materialised
// step PK), not technique_step_id. PaintResolvableStep now requires an `id` field.
// Tests updated accordingly.

describe("effectivePaintId", () => {
  it("returns the slot paint when a technique step has a FILLED slot", () => {
    // Map keyed on recipe_step.id = 1, technique_step_id = 7
    const step = { id: 1, paint_id: null, technique_step_id: 7 };
    const slotMap = new Map<number, number | null>([[1, 42]]);
    expect(effectivePaintId(step, slotMap)).toBe(42);
  });

  it("returns null when a technique step has an UNFILLED slot (value null)", () => {
    const step = { id: 1, paint_id: null, technique_step_id: 7 };
    const slotMap = new Map<number, number | null>([[1, null]]);
    expect(effectivePaintId(step, slotMap)).toBeNull();
  });

  it("returns null when a technique step's id is MISSING from the slotMap", () => {
    const step = { id: 2, paint_id: null, technique_step_id: 9 };
    const slotMap = new Map<number, number | null>();
    expect(effectivePaintId(step, slotMap)).toBeNull();
  });

  it("returns the step's own paint_id for a plain (non-technique) step", () => {
    const step = { id: 3, paint_id: 5, technique_step_id: null };
    const slotMap = new Map<number, number | null>();
    expect(effectivePaintId(step, slotMap)).toBe(5);
  });

  it("returns null for a plain step with a null paint_id", () => {
    const step = { id: 4, paint_id: null, technique_step_id: null };
    const slotMap = new Map<number, number | null>();
    expect(effectivePaintId(step, slotMap)).toBeNull();
  });
});
