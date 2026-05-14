/**
 * Phase 62 — computeAssignmentProgress pure function tests (AR-01).
 *
 * TDD RED: Tests written before implementation.
 * Covers computeCompletionPercentage edge cases and computeAssignmentProgress
 * with empty, flat, sectioned, and stale-progress scenarios.
 */
import { describe, it, expect } from "vitest";
import {
  computeCompletionPercentage,
  computeAssignmentProgress,
} from "@/lib/computeAssignmentProgress";

// ---------------------------------------------------------------------------
// Types for test fixtures (minimal shapes matching function signatures)
// ---------------------------------------------------------------------------

interface TestStep {
  id: number;
  section_id: number | null;
}

interface TestProgress {
  recipe_step_id: number;
  completed: number; // 0 | 1
}

// ---------------------------------------------------------------------------
// computeCompletionPercentage
// ---------------------------------------------------------------------------

describe("computeCompletionPercentage", () => {
  it("returns 0 when total is 0 (no division by zero)", () => {
    expect(computeCompletionPercentage(0, 0)).toBe(0);
  });

  it("returns 50 for 2 of 4 completed", () => {
    expect(computeCompletionPercentage(4, 2)).toBe(50);
  });

  it("returns 33 for 1 of 3 (rounds down from 33.33)", () => {
    expect(computeCompletionPercentage(3, 1)).toBe(33);
  });

  it("returns 100 for all completed", () => {
    expect(computeCompletionPercentage(3, 3)).toBe(100);
  });

  it("returns 43 for 3 of 7 (rounds 42.857)", () => {
    expect(computeCompletionPercentage(7, 3)).toBe(43);
  });
});

// ---------------------------------------------------------------------------
// computeAssignmentProgress
// ---------------------------------------------------------------------------

describe("computeAssignmentProgress", () => {
  it("returns zeros and empty map for empty steps array", () => {
    const result = computeAssignmentProgress([], []);
    expect(result.total).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.bySectionId.size).toBe(0);
  });

  it("computes correct totals for 4 steps with 2 completed", () => {
    const steps: TestStep[] = [
      { id: 100, section_id: null },
      { id: 101, section_id: null },
      { id: 102, section_id: null },
      { id: 103, section_id: null },
    ];
    const progress: TestProgress[] = [
      { recipe_step_id: 100, completed: 1 },
      { recipe_step_id: 101, completed: 1 },
      { recipe_step_id: 102, completed: 0 },
      { recipe_step_id: 103, completed: 0 },
    ];
    const result = computeAssignmentProgress(steps, progress);
    expect(result.total).toBe(4);
    expect(result.completed).toBe(2);
    expect(result.percentage).toBe(50);
  });

  it("groups steps by section_id in bySectionId map", () => {
    const steps: TestStep[] = [
      { id: 100, section_id: 10 },
      { id: 101, section_id: 10 },
      { id: 102, section_id: 20 },
      { id: 103, section_id: 20 },
    ];
    const progress: TestProgress[] = [
      { recipe_step_id: 100, completed: 1 },
      { recipe_step_id: 101, completed: 0 },
      { recipe_step_id: 102, completed: 1 },
      { recipe_step_id: 103, completed: 1 },
    ];
    const result = computeAssignmentProgress(steps, progress);

    expect(result.bySectionId.size).toBe(2);

    const section10 = result.bySectionId.get(10);
    expect(section10).toBeDefined();
    expect(section10!.total).toBe(2);
    expect(section10!.completed).toBe(1);

    const section20 = result.bySectionId.get(20);
    expect(section20).toBeDefined();
    expect(section20!.total).toBe(2);
    expect(section20!.completed).toBe(2);
  });

  it("handles null section_id (flat recipe) as valid Map key", () => {
    const steps: TestStep[] = [
      { id: 100, section_id: null },
      { id: 101, section_id: null },
    ];
    const progress: TestProgress[] = [
      { recipe_step_id: 100, completed: 1 },
      { recipe_step_id: 101, completed: 0 },
    ];
    const result = computeAssignmentProgress(steps, progress);

    expect(result.bySectionId.size).toBe(1);
    const flat = result.bySectionId.get(null);
    expect(flat).toBeDefined();
    expect(flat!.total).toBe(2);
    expect(flat!.completed).toBe(1);
  });

  it("ignores progress records for recipe_step_id values not in steps", () => {
    const steps: TestStep[] = [
      { id: 100, section_id: null },
      { id: 101, section_id: null },
    ];
    const progress: TestProgress[] = [
      { recipe_step_id: 100, completed: 1 },
      { recipe_step_id: 101, completed: 1 },
      { recipe_step_id: 500, completed: 1 }, // stale — no matching step
      { recipe_step_id: 900, completed: 1 }, // stale — no matching step
    ];
    const result = computeAssignmentProgress(steps, progress);
    expect(result.total).toBe(2);
    expect(result.completed).toBe(2);
    expect(result.percentage).toBe(100);
  });

  it("returns percentage 100 when all steps are completed", () => {
    const steps: TestStep[] = [
      { id: 100, section_id: 1 },
      { id: 101, section_id: 1 },
      { id: 102, section_id: 2 },
    ];
    const progress: TestProgress[] = [
      { recipe_step_id: 100, completed: 1 },
      { recipe_step_id: 101, completed: 1 },
      { recipe_step_id: 102, completed: 1 },
    ];
    const result = computeAssignmentProgress(steps, progress);
    expect(result.total).toBe(3);
    expect(result.completed).toBe(3);
    expect(result.percentage).toBe(100);
  });
});
