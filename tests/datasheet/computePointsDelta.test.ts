/**
 * Phase 65 — computePointsDelta pure function tests (PI-04).
 *
 * No mocking needed — pure function with Record inputs.
 */
import { describe, it, expect } from "vitest";
import { computePointsDelta } from "@/lib/computePointsDelta";

describe("computePointsDelta", () => {
  it("returns zero counts and empty details for two empty maps", () => {
    const result = computePointsDelta({}, {});
    expect(result).toEqual({ added: 0, removed: 0, changed: 0, details: [] });
  });

  it("detects added entries when beforeMap is empty", () => {
    const result = computePointsDelta({}, { "UnitA:SM": 100 });
    expect(result.added).toBe(1);
    expect(result.removed).toBe(0);
    expect(result.changed).toBe(0);
    expect(result.details).toHaveLength(1);
    expect(result.details[0]).toEqual({
      unitName: "UnitA",
      factionId: "SM",
      oldPoints: null,
      newPoints: 100,
      changeType: "added",
    });
  });

  it("detects removed entries when afterMap is empty", () => {
    const result = computePointsDelta({ "UnitA:SM": 100 }, {});
    expect(result.added).toBe(0);
    expect(result.removed).toBe(1);
    expect(result.changed).toBe(0);
    expect(result.details).toHaveLength(1);
    expect(result.details[0]).toEqual({
      unitName: "UnitA",
      factionId: "SM",
      oldPoints: 100,
      newPoints: null,
      changeType: "removed",
    });
  });

  it("detects changed entries when points differ", () => {
    const result = computePointsDelta({ "UnitA:SM": 100 }, { "UnitA:SM": 120 });
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
    expect(result.changed).toBe(1);
    expect(result.details).toHaveLength(1);
    expect(result.details[0]).toEqual({
      unitName: "UnitA",
      factionId: "SM",
      oldPoints: 100,
      newPoints: 120,
      changeType: "changed",
    });
  });

  it("handles mixed add/remove/change in a single call", () => {
    const before = { "UnitA:SM": 100, "UnitB:SM": 50 };
    const after = { "UnitA:SM": 120, "UnitC:SM": 75 };
    const result = computePointsDelta(before, after);

    expect(result.added).toBe(1);
    expect(result.removed).toBe(1);
    expect(result.changed).toBe(1);
    expect(result.details).toHaveLength(3);

    const added = result.details.find((d) => d.changeType === "added");
    expect(added).toEqual({
      unitName: "UnitC",
      factionId: "SM",
      oldPoints: null,
      newPoints: 75,
      changeType: "added",
    });

    const removed = result.details.find((d) => d.changeType === "removed");
    expect(removed).toEqual({
      unitName: "UnitB",
      factionId: "SM",
      oldPoints: 50,
      newPoints: null,
      changeType: "removed",
    });

    const changed = result.details.find((d) => d.changeType === "changed");
    expect(changed).toEqual({
      unitName: "UnitA",
      factionId: "SM",
      oldPoints: 100,
      newPoints: 120,
      changeType: "changed",
    });
  });

  it("handles null faction_id key correctly", () => {
    const result = computePointsDelta({}, { "UnitA:null": 100 });
    expect(result.added).toBe(1);
    expect(result.details[0]).toEqual({
      unitName: "UnitA",
      factionId: null,
      oldPoints: null,
      newPoints: 100,
      changeType: "added",
    });
  });

  it("does not report unchanged entries", () => {
    const before = { "UnitA:SM": 100, "UnitB:SM": 50 };
    const after = { "UnitA:SM": 100, "UnitB:SM": 50 };
    const result = computePointsDelta(before, after);
    expect(result).toEqual({ added: 0, removed: 0, changed: 0, details: [] });
  });
});
