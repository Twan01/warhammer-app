import { describe, it, expect } from "vitest";

// TODO(24-02): import { computeDelta } from "@/lib/computeDelta";

describe.skip("computeDelta", () => {
  // DELTA-01: candidatePoints - effective_points correct for positive and negative cases
  it.skip("returns positive delta when candidate points > effective points", () => {
    // TODO(24-02): expect(computeDelta(120, 100)).toBe(20)
    // Display as "+20" in red (costs more)
  });

  it.skip("returns negative delta when candidate points < effective points", () => {
    // TODO(24-02): expect(computeDelta(80, 100)).toBe(-20)
    // Display as "-20" in green (saves points)
  });

  it.skip("returns 0 when candidate equals effective (no delta badge shown)", () => {
    // TODO(24-02): expect(computeDelta(100, 100)).toBe(0)
  });

  it.skip("handles null candidate by returning 0 (no pending selection)", () => {
    // TODO(24-02): expect(computeDelta(null, 100)).toBe(0)
  });
});
