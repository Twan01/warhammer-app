/**
 * Phase 22 — Hobby Goals Zod schema validation tests.
 *
 * Plan 22-01: Wave 0 stubs activated with real test bodies.
 *
 * Covers ANLY-01 (goalSchema validates name, target_count, timeframe).
 */

import { describe, it, expect } from "vitest";
import { goalSchema } from "@/features/goals/goalSchema";

describe("goalSchema (ANLY-01)", () => {
  it("accepts valid goal with name, target_count >= 1, timeframe 'month'", () => {
    const result = goalSchema.safeParse({
      name: "Paint 5 units",
      target_count: 5,
      timeframe: "month",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid goal with timeframe 'quarter'", () => {
    const result = goalSchema.safeParse({
      name: "Paint 10 models",
      target_count: 10,
      timeframe: "quarter",
    });
    expect(result.success).toBe(true);
  });

  it("rejects goal with empty name", () => {
    const result = goalSchema.safeParse({
      name: "",
      target_count: 5,
      timeframe: "month",
    });
    expect(result.success).toBe(false);
  });

  it("rejects goal with target_count < 1", () => {
    const result = goalSchema.safeParse({
      name: "Paint something",
      target_count: 0,
      timeframe: "month",
    });
    expect(result.success).toBe(false);
  });
});
