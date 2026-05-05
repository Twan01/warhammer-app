/**
 * Phase 22 — GoalSheet component stubs.
 *
 * Wave 0: it.skip placeholders naming the exact behavior Plan 22-02 must satisfy.
 * Mocks React Query hooks with vi.mock — no real DB or Tauri bridge needed.
 * Mirrors tests/battle-log/ Sheet test pattern.
 *
 * Covers ANLY-01 (GoalSheet renders correct fields, submits with derived period, pre-fills in edit mode).
 */

// TODO Plan 22-02: import { GoalSheet } from "@/features/goals/GoalSheet"

import { describe, it } from "vitest";

describe("GoalSheet (ANLY-01)", () => {
  it.skip("renders Name, Target, and Timeframe fields in create mode", () => {});
  it.skip("calls useCreateGoal on submit with name, target_count, timeframe, period", () => {});
  it.skip("pre-fills fields when editingGoal is provided", () => {});
});
