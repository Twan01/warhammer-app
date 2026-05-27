/**
 * SCHEMA-02 â€” recipeSchema Zod metadata validation tests.
 *
 * Verifies:
 *  1. RECIPE_STYLES, RECIPE_SURFACES, RECIPE_EFFECTS, RECIPE_DIFFICULTIES are
 *     non-empty readonly arrays.
 *  2. A valid recipe with metadata fields passes Zod validation.
 *  3. estimated_minutes rejects 0 (min is 1) and non-integer values.
 *  4. estimated_minutes accepts null (nullable).
 *  5. style / surface / effect / difficulty accept null (nullable).
 */
import { describe, it, expect } from "vitest";
import {
  recipeSchema,
  RECIPE_STYLES,
  RECIPE_SURFACES,
  RECIPE_EFFECTS,
  RECIPE_DIFFICULTIES,
} from "@/features/recipes/recipeSchema";

/** Minimal valid base shape â€” only required field is name. */
const BASE_VALID = {
  name: "Crimson Armor",
  faction_id: null,
  unit_id: null,
  area: null,
  notes: null,
  tutorial_link: null,
  style: null,
  surface: null,
  effect: null,
  difficulty: null,
  estimated_minutes: null,
  result_photo_path: null,
};

describe("recipeSchema â€” const arrays (SCHEMA-02)", () => {
  it("RECIPE_STYLES is a non-empty array", () => {
    expect(Array.isArray(RECIPE_STYLES)).toBe(true);
    expect(RECIPE_STYLES.length).toBeGreaterThan(0);
  });

  it("RECIPE_SURFACES is a non-empty array", () => {
    expect(Array.isArray(RECIPE_SURFACES)).toBe(true);
    expect(RECIPE_SURFACES.length).toBeGreaterThan(0);
  });

  it("RECIPE_EFFECTS is a non-empty array", () => {
    expect(Array.isArray(RECIPE_EFFECTS)).toBe(true);
    expect(RECIPE_EFFECTS.length).toBeGreaterThan(0);
  });

  it("RECIPE_DIFFICULTIES is a non-empty array", () => {
    expect(Array.isArray(RECIPE_DIFFICULTIES)).toBe(true);
    expect(RECIPE_DIFFICULTIES.length).toBeGreaterThan(0);
  });
});

describe("recipeSchema â€” valid recipe with metadata passes (SCHEMA-02)", () => {
  it("accepts a fully populated recipe with all metadata fields", () => {
    const input = {
      ...BASE_VALID,
      style: "Battle Ready",
      surface: "Armor",
      effect: "Weathered",
      difficulty: "Intermediate",
      estimated_minutes: 45,
      result_photo_path: "/photos/recipe-1.jpg",
    };
    const result = recipeSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts a recipe with all metadata fields set to null", () => {
    const result = recipeSchema.safeParse(BASE_VALID);
    expect(result.success).toBe(true);
  });
});

describe("recipeSchema â€” estimated_minutes validation (SCHEMA-02)", () => {
  it("rejects 0 (min is 1)", () => {
    const result = recipeSchema.safeParse({ ...BASE_VALID, estimated_minutes: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects a negative value", () => {
    const result = recipeSchema.safeParse({ ...BASE_VALID, estimated_minutes: -5 });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer value (e.g. 4.5)", () => {
    const result = recipeSchema.safeParse({ ...BASE_VALID, estimated_minutes: 4.5 });
    expect(result.success).toBe(false);
  });

  it("accepts null (nullable)", () => {
    const result = recipeSchema.safeParse({ ...BASE_VALID, estimated_minutes: null });
    expect(result.success).toBe(true);
  });

  it("accepts a positive integer (e.g. 60)", () => {
    const result = recipeSchema.safeParse({ ...BASE_VALID, estimated_minutes: 60 });
    expect(result.success).toBe(true);
  });
});

describe("recipeSchema â€” nullable metadata string fields (SCHEMA-02)", () => {
  it("style accepts null", () => {
    const result = recipeSchema.safeParse({ ...BASE_VALID, style: null });
    expect(result.success).toBe(true);
  });

  it("style accepts a string value", () => {
    const result = recipeSchema.safeParse({ ...BASE_VALID, style: "Display" });
    expect(result.success).toBe(true);
  });

  it("surface accepts null", () => {
    const result = recipeSchema.safeParse({ ...BASE_VALID, surface: null });
    expect(result.success).toBe(true);
  });

  it("effect accepts null", () => {
    const result = recipeSchema.safeParse({ ...BASE_VALID, effect: null });
    expect(result.success).toBe(true);
  });

  it("difficulty accepts null", () => {
    const result = recipeSchema.safeParse({ ...BASE_VALID, difficulty: null });
    expect(result.success).toBe(true);
  });
});
