import { describe, it, expect } from "vitest";
import { effectivePaintId } from "@/lib/effectivePaintId";

describe("effectivePaintId", () => {
  it("returns the slot paint when a technique step has a FILLED slot", () => {
    const step = { paint_id: null, technique_step_id: 7 };
    const slotMap = new Map<number, number | null>([[7, 42]]);
    expect(effectivePaintId(step, slotMap)).toBe(42);
  });

  it("returns null when a technique step has an UNFILLED slot (value null)", () => {
    const step = { paint_id: null, technique_step_id: 7 };
    const slotMap = new Map<number, number | null>([[7, null]]);
    expect(effectivePaintId(step, slotMap)).toBeNull();
  });

  it("returns null when a technique step's id is MISSING from the slotMap", () => {
    const step = { paint_id: null, technique_step_id: 9 };
    const slotMap = new Map<number, number | null>();
    expect(effectivePaintId(step, slotMap)).toBeNull();
  });

  it("returns the step's own paint_id for a plain (non-technique) step", () => {
    const step = { paint_id: 5, technique_step_id: null };
    const slotMap = new Map<number, number | null>();
    expect(effectivePaintId(step, slotMap)).toBe(5);
  });

  it("returns null for a plain step with a null paint_id", () => {
    const step = { paint_id: null, technique_step_id: null };
    const slotMap = new Map<number, number | null>();
    expect(effectivePaintId(step, slotMap)).toBeNull();
  });
});
