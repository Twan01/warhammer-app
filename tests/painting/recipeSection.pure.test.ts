/**
 * FORM-05, FORM-06 â€” recipeSection pure-function utilities.
 *
 * Tests for DraftSection, makeDraftSection, and buildDraftSections.
 * These are pure functions â€” no mocks needed.
 */
import { describe, it, expect } from "vitest";
import {
  type DraftSection,
  makeDraftSection,
  buildDraftSections,
} from "@/features/recipes/recipeSection";
import type { RecipeSection } from "@/types/recipeSection";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SECTION_1: RecipeSection = {
  id: 1,
  recipe_id: 10,
  name: "Armor",
  surface: "Smooth",
  optional: 0,
  order_index: 0,
  notes: null,
  section_type: null,
  technique: null,
  execution_mode: null,
  applies_to: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const SECTION_2: RecipeSection = {
  id: 2,
  recipe_id: 10,
  name: "Cloth",
  surface: null,
  optional: 1,
  order_index: 1,
  notes: "Optional section",
  section_type: null,
  technique: null,
  execution_mode: null,
  applies_to: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const STEP_A = {
  id: 101,
  recipe_id: 10,
  paint_id: 1,
  step_name: "Base coat",
  order_index: 0,
  notes: null,
  painting_phase: "Basecoat",
  tool: "Brush",
  technique: null,
  dilution: null,
  time_estimate_minutes: 10,
  step_photo_path: null,
  alt_paint_id: null,
  section_id: 1,
  created_at: "2026-01-01",
};

const STEP_B = {
  id: 102,
  recipe_id: 10,
  paint_id: 2,
  step_name: "Wash",
  order_index: 1,
  notes: "Thin coat",
  painting_phase: null,
  tool: null,
  technique: "Wash",
  dilution: "1:1",
  time_estimate_minutes: 5,
  step_photo_path: null,
  alt_paint_id: 3,
  section_id: 1,
  created_at: "2026-01-01",
};

const STEP_C = {
  id: 103,
  recipe_id: 10,
  paint_id: 4,
  step_name: "Drybrush",
  order_index: 0,
  notes: null,
  painting_phase: "Highlight",
  tool: "Drybrush",
  technique: "Drybrush",
  dilution: null,
  time_estimate_minutes: null,
  step_photo_path: "photo.jpg",
  alt_paint_id: null,
  section_id: 2,
  created_at: "2026-01-01",
};

// ---------------------------------------------------------------------------
// makeDraftSection
// ---------------------------------------------------------------------------

describe("recipeSection pure functions â€” makeDraftSection", () => {
  it("Test 1: returns default name 'Steps', all null fields, empty steps array, and UUID localId", () => {
    const result: DraftSection = makeDraftSection();
    expect(result.name).toBe("Steps");
    expect(result.surface).toBeNull();
    expect(result.optional).toBe(0);
    expect(result.notes).toBeNull();
    expect(result.steps).toEqual([]);
    expect(result.localId).toHaveLength(36);
    expect(result.dbId).toBeNull();
  });

  it("Test 2: accepts a custom name and uses it", () => {
    const result = makeDraftSection("Armor");
    expect(result.name).toBe("Armor");
    expect(result.localId).toHaveLength(36);
  });

  it("Test 2b: returns null for all four workflow metadata fields", () => {
    const result = makeDraftSection();
    expect(result.section_type).toBeNull();
    expect(result.technique).toBeNull();
    expect(result.execution_mode).toBeNull();
    expect(result.applies_to).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildDraftSections
// ---------------------------------------------------------------------------

describe("recipeSection pure functions â€” buildDraftSections", () => {
  it("Test 3: groups steps into sections by section_id (2 sections, 3 steps = 2+1)", () => {
    const result = buildDraftSections([SECTION_1, SECTION_2], [STEP_A, STEP_B, STEP_C]);
    expect(result).toHaveLength(2);
    expect(result[0].steps).toHaveLength(2);
    expect(result[1].steps).toHaveLength(1);
  });

  it("populates dbId from section.id on each DraftSection", () => {
    const result = buildDraftSections([SECTION_1, SECTION_2], []);
    expect(result[0].dbId).toBe(1);
    expect(result[1].dbId).toBe(2);
  });

  it("populates dbId from step.id on each nested DraftStep", () => {
    const result = buildDraftSections([SECTION_1], [STEP_A, STEP_B]);
    expect(result[0].steps[0].dbId).toBe(101);
    expect(result[0].steps[1].dbId).toBe(102);
  });

  it("Test 4: sorts steps within a section by order_index ascending", () => {
    // Pass steps out of order: B (order_index 1) before A (order_index 0)
    const result = buildDraftSections([SECTION_1], [STEP_B, STEP_A]);
    expect(result[0].steps[0].step_name).toBe("Base coat"); // order_index 0
    expect(result[0].steps[1].step_name).toBe("Wash");      // order_index 1
  });

  it("Test 5: returns sections with empty steps arrays when steps array is empty", () => {
    const result = buildDraftSections([SECTION_1, SECTION_2], []);
    expect(result).toHaveLength(2);
    expect(result[0].steps).toEqual([]);
    expect(result[1].steps).toEqual([]);
  });

  it("Test 6: maps all nullable DraftStep fields with null fallback (undefined â†’ null)", () => {
    const stepWithUndefined = {
      ...STEP_A,
      painting_phase: undefined as unknown as null,
      tool: undefined as unknown as null,
      technique: undefined as unknown as null,
      dilution: undefined as unknown as null,
      time_estimate_minutes: undefined as unknown as null,
      step_photo_path: undefined as unknown as null,
      alt_paint_id: undefined as unknown as null,
    };
    const result = buildDraftSections([SECTION_1], [stepWithUndefined]);
    const mapped = result[0].steps[0];
    expect(mapped.painting_phase).toBeNull();
    expect(mapped.tool).toBeNull();
    expect(mapped.technique).toBeNull();
    expect(mapped.dilution).toBeNull();
    expect(mapped.time_estimate_minutes).toBeNull();
    expect(mapped.step_photo_path).toBeNull();
    expect(mapped.alt_paint_id).toBeNull();
  });

  it("assigns unique UUID localIds to each section", () => {
    const result = buildDraftSections([SECTION_1, SECTION_2], []);
    expect(result[0].localId).toHaveLength(36);
    expect(result[1].localId).toHaveLength(36);
    expect(result[0].localId).not.toBe(result[1].localId);
  });

  it("assigns unique UUID localIds to each nested step", () => {
    const result = buildDraftSections([SECTION_1], [STEP_A, STEP_B]);
    const [stepA, stepB] = result[0].steps;
    expect(stepA.localId).toHaveLength(36);
    expect(stepB.localId).toHaveLength(36);
    expect(stepA.localId).not.toBe(stepB.localId);
  });

  it("Test 7: maps non-null workflow metadata fields from DB rows", () => {
    const sectionWithMetadata: RecipeSection = {
      ...SECTION_1,
      section_type: "basecoat",
      technique: "airbrush",
      execution_mode: "sequential",
      applies_to: "armor panels",
    };
    const result = buildDraftSections([sectionWithMetadata], []);
    expect(result[0].section_type).toBe("basecoat");
    expect(result[0].technique).toBe("airbrush");
    expect(result[0].execution_mode).toBe("sequential");
    expect(result[0].applies_to).toBe("armor panels");
  });

  it("Test 8: maps null workflow metadata fields from DB rows (null stays null)", () => {
    const result = buildDraftSections([SECTION_1], []);
    expect(result[0].section_type).toBeNull();
    expect(result[0].technique).toBeNull();
    expect(result[0].execution_mode).toBeNull();
    expect(result[0].applies_to).toBeNull();
  });

  it("Test 9: maps undefined workflow metadata to null (undefined â†’ null fallback)", () => {
    const sectionWithUndefined = {
      ...SECTION_1,
      section_type: undefined as unknown as null,
      technique: undefined as unknown as null,
      execution_mode: undefined as unknown as null,
      applies_to: undefined as unknown as null,
    };
    const result = buildDraftSections([sectionWithUndefined], []);
    expect(result[0].section_type).toBeNull();
    expect(result[0].technique).toBeNull();
    expect(result[0].execution_mode).toBeNull();
    expect(result[0].applies_to).toBeNull();
  });
});
