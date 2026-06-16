import { describe, it, expect } from "vitest";

// TEMPORARY — deliberate-red CI gate verification (Phase 131 / REL-01).
// This test intentionally fails to prove the CI gate blocks merge on red.
// It is removed immediately after the gate is confirmed working.
describe("CI gate deliberate-red verification (temporary)", () => {
  it("intentionally fails to prove CI blocks merge", () => {
    expect(1).toBe(2);
  });
});
