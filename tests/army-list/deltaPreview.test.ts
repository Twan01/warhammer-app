import { describe, it, expect } from "vitest";
import { computeDelta } from "@/lib/computeDelta";

describe("computeDelta", () => {
  // DELTA-01: candidatePoints - effective_points correct for positive and negative cases
  it("returns positive delta when candidate points > effective points", () => {
    expect(computeDelta(120, 100)).toBe(20);
    // Display as "+20" in red (costs more)
  });

  it("returns negative delta when candidate points < effective points", () => {
    expect(computeDelta(80, 100)).toBe(-20);
    // Display as "-20" in green (saves points)
  });

  it("returns 0 when candidate equals effective (no delta badge shown)", () => {
    expect(computeDelta(100, 100)).toBe(0);
  });

  it("handles null candidate by returning 0 (no pending selection)", () => {
    expect(computeDelta(null, 100)).toBe(0);
  });
});
