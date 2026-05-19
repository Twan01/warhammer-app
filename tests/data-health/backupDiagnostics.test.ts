/**
 * Phase 83 -- Version mismatch detection logic tests (DGN-03).
 *
 * Tests the hasVersionMismatch pure function that compares the stored
 * backup app_version against the current app version.
 */
import { describe, it, expect } from "vitest";
import { hasVersionMismatch } from "@/lib/backupFreshness";

describe("hasVersionMismatch", () => {
  it("returns false when backupVersion is undefined (legacy backup)", () => {
    expect(hasVersionMismatch(undefined, "0.2.14")).toBe(false);
  });

  it("returns false when currentVersion is null (version not yet loaded)", () => {
    expect(hasVersionMismatch("0.2.14", null)).toBe(false);
  });

  it("returns false when both are nullish (no data available)", () => {
    expect(hasVersionMismatch(undefined, null)).toBe(false);
  });

  it("returns true when versions differ", () => {
    expect(hasVersionMismatch("0.2.13", "0.2.14")).toBe(true);
  });

  it("returns false when versions match", () => {
    expect(hasVersionMismatch("0.2.14", "0.2.14")).toBe(false);
  });

  it("returns true for major version difference", () => {
    expect(hasVersionMismatch("0.1.0", "0.2.14")).toBe(true);
  });
});
