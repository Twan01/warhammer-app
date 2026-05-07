/**
 * DATA-01 — logSessionSchema extension: new_status field tests.
 *
 * Verifies that the new optional/nullable PaintingStatus field on
 * logSessionSchema behaves correctly across all allowed input variants.
 */
import { describe, it, expect } from "vitest";
import { logSessionSchema } from "@/features/dashboard/logSessionSchema";
import { PAINTING_STATUS_ORDER } from "@/types/unit";

const BASE_VALID = {
  unit_id: 1,
  session_date: "2026-01-01",
  duration_minutes: 30,
  notes: null,
};

describe("logSessionSchema — DATA-01 (new_status field)", () => {
  it("parses successfully when new_status is omitted (field is optional)", () => {
    const result = logSessionSchema.safeParse(BASE_VALID);
    expect(result.success).toBe(true);
  });

  it("parses successfully when new_status is null (field is nullable)", () => {
    const result = logSessionSchema.safeParse({ ...BASE_VALID, new_status: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.new_status).toBeNull();
    }
  });

  it("parses successfully when new_status is a valid PaintingStatus ('Basecoated')", () => {
    const result = logSessionSchema.safeParse({ ...BASE_VALID, new_status: "Basecoated" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.new_status).toBe("Basecoated");
    }
  });

  it("fails to parse when new_status is 'InvalidStatus' (not in PAINTING_STATUS_ORDER)", () => {
    const result = logSessionSchema.safeParse({ ...BASE_VALID, new_status: "InvalidStatus" });
    expect(result.success).toBe(false);
  });

  it("accepts every value in PAINTING_STATUS_ORDER as a valid new_status", () => {
    for (const status of PAINTING_STATUS_ORDER) {
      const result = logSessionSchema.safeParse({ ...BASE_VALID, new_status: status });
      expect(result.success, `Expected ${status} to be valid`).toBe(true);
    }
  });

  it("default values object { ...BASE_VALID, new_status: null } parses successfully (covers buildDefaultValues return shape)", () => {
    const result = logSessionSchema.safeParse({
      unit_id: 1,
      session_date: "2026-01-01",
      duration_minutes: 30,
      notes: null,
      new_status: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("logSessionSchema — INTEG-01 (recipe_id + recipe_step_id fields)", () => {
  it("parses successfully when recipe_id is omitted (field is optional)", () => {
    const result = logSessionSchema.safeParse(BASE_VALID);
    expect(result.success).toBe(true);
  });

  it("parses successfully when recipe_id is null (field is nullable)", () => {
    const result = logSessionSchema.safeParse({ ...BASE_VALID, recipe_id: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recipe_id).toBeNull();
    }
  });

  it("parses successfully when recipe_id is a positive integer", () => {
    const result = logSessionSchema.safeParse({ ...BASE_VALID, recipe_id: 5 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recipe_id).toBe(5);
    }
  });

  it("fails when recipe_id is 0 (not positive)", () => {
    const result = logSessionSchema.safeParse({ ...BASE_VALID, recipe_id: 0 });
    expect(result.success).toBe(false);
  });

  it("fails when recipe_id is a negative number", () => {
    const result = logSessionSchema.safeParse({ ...BASE_VALID, recipe_id: -1 });
    expect(result.success).toBe(false);
  });

  it("parses successfully when recipe_step_id is null", () => {
    const result = logSessionSchema.safeParse({ ...BASE_VALID, recipe_step_id: null });
    expect(result.success).toBe(true);
  });

  it("parses successfully when recipe_step_id is a positive integer", () => {
    const result = logSessionSchema.safeParse({ ...BASE_VALID, recipe_step_id: 12 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recipe_step_id).toBe(12);
    }
  });

  it("parses successfully with both recipe_id and recipe_step_id set", () => {
    const result = logSessionSchema.safeParse({ ...BASE_VALID, recipe_id: 3, recipe_step_id: 15 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recipe_id).toBe(3);
      expect(result.data.recipe_step_id).toBe(15);
    }
  });

  it("buildDefaultValues shape with nulls parses successfully", () => {
    const result = logSessionSchema.safeParse({
      unit_id: 1,
      session_date: "2026-01-01",
      duration_minutes: 30,
      notes: null,
      new_status: null,
      recipe_id: null,
      recipe_step_id: null,
    });
    expect(result.success).toBe(true);
  });
});
