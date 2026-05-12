/**
 * Phase 60 — computeWorkflowPosition pure function tests.
 *
 * Covers all degradation scenarios (D-05, D-17, D-18, D-04, D-09)
 * and edge cases (orphaned step IDs, section_name-only, flat recipes).
 */
import { describe, it, expect } from "vitest";
import {
  computeWorkflowPosition,
  type WorkflowPosition,
} from "@/lib/computeWorkflowPosition";
import type { RecipeSection } from "@/types/recipeSection";
import type { RecipeStep } from "@/types/recipePaint";

// ---------------------------------------------------------------------------
// Helpers — minimal fixture builders (only fields the function uses)
// ---------------------------------------------------------------------------

function makeSection(overrides: Partial<RecipeSection> & { id: number; name: string; order_index: number }): RecipeSection {
  return {
    recipe_id: 1,
    surface: null,
    optional: 0,
    notes: null,
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function makeStep(overrides: Partial<RecipeStep> & { id: number; step_name: string; order_index: number }): RecipeStep {
  return {
    recipe_id: 1,
    paint_id: 1,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
    section_id: null,
    created_at: "",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const flatSteps: RecipeStep[] = [
  makeStep({ id: 10, step_name: "Prime Black", order_index: 0 }),
  makeStep({ id: 11, step_name: "Base Leadbelcher", order_index: 1 }),
  makeStep({ id: 12, step_name: "Wash Nuln Oil", order_index: 2 }),
];

const sections: RecipeSection[] = [
  makeSection({ id: 1, name: "Armour", order_index: 0, technique: "brush" }),
  makeSection({ id: 2, name: "Cloth", order_index: 1, technique: "drybrush" }),
  makeSection({ id: 3, name: "Basing", order_index: 2, technique: null }),
];

const sectionedSteps: RecipeStep[] = [
  // Armour steps
  makeStep({ id: 20, step_name: "Base Silver", order_index: 0, section_id: 1 }),
  makeStep({ id: 21, step_name: "Wash Black", order_index: 1, section_id: 1 }),
  // Cloth steps
  makeStep({ id: 30, step_name: "Base Red", order_index: 0, section_id: 2 }),
  makeStep({ id: 31, step_name: "Layer Highlight", order_index: 1, section_id: 2 }),
  makeStep({ id: 32, step_name: "Edge Highlight", order_index: 2, section_id: 2 }),
  // Basing steps
  makeStep({ id: 40, step_name: "Texture Paste", order_index: 0, section_id: 3 }),
  makeStep({ id: 41, step_name: "Drybrush Sand", order_index: 1, section_id: 3 }),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("computeWorkflowPosition", () => {
  // Test 1 (D-05): null when both inputs null
  it("returns null when both lastSessionStepId and lastSessionSectionName are null", () => {
    const result = computeWorkflowPosition(null, null, sections, sectionedSteps);
    expect(result).toBeNull();
  });

  // Test 2 (D-05): null when steps array is empty
  it("returns null when steps array is empty", () => {
    const result = computeWorkflowPosition(20, "Armour", sections, []);
    expect(result).toBeNull();
  });

  // Test 3 (D-17): flat recipe with step ID
  it("flat recipe returns step-only position (no section info)", () => {
    const result = computeWorkflowPosition(11, null, [], flatSteps);
    expect(result).not.toBeNull();
    expect(result!.sectionName).toBeNull();
    expect(result!.sectionIndex).toBeNull();
    expect(result!.totalSections).toBe(0);
    expect(result!.stepName).toBe("Base Leadbelcher");
    expect(result!.stepIndex).toBe(1);
    expect(result!.totalSteps).toBe(3);
    expect(result!.isComplete).toBe(false);
    expect(result!.nextStepName).toBe("Wash Nuln Oil");
  });

  // Test 4 (D-17): flat recipe last step -> isComplete
  it("flat recipe last step returns isComplete=true and nextStepName=null", () => {
    const result = computeWorkflowPosition(12, null, [], flatSteps);
    expect(result).not.toBeNull();
    expect(result!.isComplete).toBe(true);
    expect(result!.nextStepName).toBeNull();
    expect(result!.stepIndex).toBe(2);
    expect(result!.totalSteps).toBe(3);
  });

  // Test 5 (D-18): sectioned recipe full position
  it("sectioned recipe returns full section+step position with technique", () => {
    const result = computeWorkflowPosition(30, null, sections, sectionedSteps);
    expect(result).not.toBeNull();
    expect(result!.sectionName).toBe("Cloth");
    expect(result!.sectionIndex).toBe(1);
    expect(result!.totalSections).toBe(3);
    expect(result!.stepName).toBe("Base Red");
    expect(result!.stepIndex).toBe(0);
    expect(result!.totalSteps).toBe(3); // Cloth has 3 steps
    expect(result!.technique).toBe("drybrush");
    expect(result!.isComplete).toBe(false);
  });

  // Test 6 (D-03): next step within same section
  it("next step within same section returns correct nextStepName", () => {
    const result = computeWorkflowPosition(30, null, sections, sectionedSteps);
    expect(result).not.toBeNull();
    expect(result!.nextStepName).toBe("Layer Highlight");
  });

  // Test 7 (D-03): last step of non-last section -> first step of next section
  it("last step of non-last section returns first step of next section as nextStepName", () => {
    const result = computeWorkflowPosition(32, null, sections, sectionedSteps);
    expect(result).not.toBeNull();
    expect(result!.sectionName).toBe("Cloth");
    expect(result!.stepIndex).toBe(2);
    expect(result!.nextStepName).toBe("Texture Paste"); // first step of Basing
  });

  // Test 8 (D-09): last step of last section -> isComplete
  it("last step of last section returns isComplete=true and nextStepName=null", () => {
    const result = computeWorkflowPosition(41, null, sections, sectionedSteps);
    expect(result).not.toBeNull();
    expect(result!.sectionName).toBe("Basing");
    expect(result!.sectionIndex).toBe(2);
    expect(result!.isComplete).toBe(true);
    expect(result!.nextStepName).toBeNull();
  });

  // Test 9 (D-04): section_name only, no step ID
  it("section_name only returns section-level position with stepName=null", () => {
    const result = computeWorkflowPosition(null, "Cloth", sections, sectionedSteps);
    expect(result).not.toBeNull();
    expect(result!.sectionName).toBe("Cloth");
    expect(result!.sectionIndex).toBe(1);
    expect(result!.totalSections).toBe(3);
    expect(result!.stepName).toBeNull();
    expect(result!.stepIndex).toBeNull();
    expect(result!.totalSteps).toBe(3);
    expect(result!.technique).toBe("drybrush");
    expect(result!.isComplete).toBe(false);
    expect(result!.nextStepName).toBeNull();
  });

  // Test 10 (Pitfall 5): orphaned step ID falls back to section_name
  it("orphaned step ID falls back to section_name match", () => {
    const result = computeWorkflowPosition(999, "Armour", sections, sectionedSteps);
    expect(result).not.toBeNull();
    expect(result!.sectionName).toBe("Armour");
    expect(result!.sectionIndex).toBe(0);
    expect(result!.stepName).toBeNull(); // section-level only
    expect(result!.stepIndex).toBeNull();
  });

  // Test 11: orphaned step ID with no section_name -> null
  it("orphaned step ID with no section_name returns null", () => {
    const result = computeWorkflowPosition(999, null, sections, sectionedSteps);
    expect(result).toBeNull();
  });

  // Test 12: section_name that doesn't match any section -> null
  it("section_name that does not match any section returns null", () => {
    const result = computeWorkflowPosition(null, "Nonexistent", sections, sectionedSteps);
    expect(result).toBeNull();
  });
});
