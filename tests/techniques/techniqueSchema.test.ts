// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { techniqueSchema } from "@/features/techniques/techniqueSchema";

describe("techniqueSchema", () => {
  it("accepts a valid technique with name and nullable metadata", () => {
    const result = techniqueSchema.safeParse({
      name: "OSL Glow",
      description: null,
      effect: "OSL",
      difficulty: "Advanced",
      estimated_minutes: null,
      result_photo_path: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for all optional fields", () => {
    const result = techniqueSchema.safeParse({
      name: "Simple Wash",
      description: null,
      effect: null,
      difficulty: null,
      estimated_minutes: null,
      result_photo_path: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name (min(1) violation)", () => {
    const result = techniqueSchema.safeParse({
      name: "",
      description: null,
      effect: null,
      difficulty: null,
      estimated_minutes: null,
      result_photo_path: null,
      notes: null,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("required");
  });

  it("rejects name longer than 120 characters", () => {
    const result = techniqueSchema.safeParse({
      name: "A".repeat(121),
      description: null,
      effect: null,
      difficulty: null,
      estimated_minutes: null,
      result_photo_path: null,
      notes: null,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("120");
  });

  it("rejects description longer than 500 characters", () => {
    const result = techniqueSchema.safeParse({
      name: "Valid Name",
      description: "D".repeat(501),
      effect: null,
      difficulty: null,
      estimated_minutes: null,
      result_photo_path: null,
      notes: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects notes longer than 2000 characters", () => {
    const result = techniqueSchema.safeParse({
      name: "Valid Name",
      description: null,
      effect: null,
      difficulty: null,
      estimated_minutes: null,
      result_photo_path: null,
      notes: "N".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects estimated_minutes less than 1 when provided", () => {
    const result = techniqueSchema.safeParse({
      name: "Valid Name",
      description: null,
      effect: null,
      difficulty: null,
      estimated_minutes: 0,
      result_photo_path: null,
      notes: null,
    });
    expect(result.success).toBe(false);
  });
});
