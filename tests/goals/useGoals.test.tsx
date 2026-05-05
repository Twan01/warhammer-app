/**
 * Phase 22 — useGoals / useGoalProgress / useCreateGoal / useDeleteGoal hook stubs.
 *
 * Wave 0: it.skip placeholders naming the exact behavior Plan 22-02 must satisfy.
 * Mirrors tests/battle-log/ hook test pattern with vi.mock for React Query hooks.
 *
 * Covers ANLY-01 (useGoals query, useCreateGoal/useDeleteGoal cache invalidation),
 *         ANLY-02 (useGoalProgress enabled behavior, useCreatePaintingSession goal-progress invalidation).
 */

// TODO Plan 22-02: import { useGoals, useGoalProgress, useCreateGoal, useDeleteGoal } from "@/hooks/useGoals"

import { describe, it } from "vitest";

describe("useGoals hook (ANLY-01)", () => {
  it.skip("returns goals from getGoals query", () => {});
});

describe("useGoalProgress hook (ANLY-02)", () => {
  it.skip("is disabled when goals are undefined", () => {});
  it.skip("is enabled when goals is empty array", () => {});
});

describe("useCreateGoal mutation (ANLY-01)", () => {
  it.skip("invalidates goals and goal-progress keys on success", () => {});
});

describe("useDeleteGoal mutation (ANLY-01)", () => {
  it.skip("invalidates goals and goal-progress keys on success", () => {});
});

describe("useCreatePaintingSession invalidation (ANLY-02)", () => {
  it.skip("invalidates goal-progress key on success", () => {});
});
