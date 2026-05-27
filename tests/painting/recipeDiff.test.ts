/**
 * Phase 70 â€” Non-Destructive Recipe Save
 * Gap 70-02-01: Section diff algorithm
 * Gap 70-02-02: Step diff + edge cases
 *
 * These are behavioral tests for pure diff functions extracted from RecipeFormSheet.tsx.
 * Every test is designed to fail if the implementation deviates from the required behavior.
 */
import { describe, it, expect } from "vitest";
import {
  computeSectionDiff,
  buildSectionIdMap,
  computeStepDiff,
} from "@/lib/recipeDiff";
import type { DraftSection } from "@/types/recipe";
import type { RecipeSection } from "@/types/recipeSection";
import type { RecipeStep } from "@/types/recipePaint";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Helper: a minimal RecipeSection as it comes from the DB */
function dbSection(id: number, overrides: Partial<RecipeSection> = {}): RecipeSection {
  return {
    id,
    recipe_id: 10,
    name: `Section ${id}`,
    surface: null,
    optional: 0,
    order_index: id - 1,
    notes: null,
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

/** Helper: a draft section that already existed in DB (dbId !== null) */
function existingDraft(localId: string, dbId: number, overrides: Partial<DraftSection> = {}): DraftSection {
  return {
    localId,
    dbId,
    name: `Section ${dbId}`,
    surface: null,
    optional: 0,
    notes: null,
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    steps: [],
    ...overrides,
  };
}

/** Helper: a brand-new draft section (dbId === null) */
function newDraft(localId: string, overrides: Partial<DraftSection> = {}): DraftSection {
  return {
    localId,
    dbId: null,
    name: "New Section",
    surface: null,
    optional: 0,
    notes: null,
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    steps: [],
    ...overrides,
  };
}

/** Helper: a minimal RecipeStep as it comes from the DB */
function dbStep(id: number, sectionId: number | null = null, overrides: Partial<RecipeStep> = {}): RecipeStep {
  return {
    id,
    recipe_id: 10,
    paint_id: null,
    step_name: `Step ${id}`,
    order_index: 0,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
    section_id: sectionId,
    created_at: "2026-01-01",
    ...overrides,
  };
}

/** Helper: a DraftStep that already existed in DB */
function existingDraftStep(localId: string, dbId: number) {
  return {
    localId,
    dbId,
    step_name: `Step ${dbId}`,
    paint_id: null,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
  };
}

/** Helper: a brand-new DraftStep (dbId === null) */
function newDraftStep(localId: string) {
  return {
    localId,
    dbId: null as null,
    step_name: "New Step",
    paint_id: null,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    step_photo_path: null,
    alt_paint_id: null,
  };
}

// ---------------------------------------------------------------------------
// Gap 70-02-01: Section diff algorithm
// ---------------------------------------------------------------------------

describe("computeSectionDiff â€” Phase 1: surviving section dbIds set", () => {
  it("collects all non-null dbIds from draft sections into the surviving set", () => {
    // Three draft sections: two survivors, one new
    const draft = [
      existingDraft("local-a", 1),
      existingDraft("local-b", 2),
      newDraft("local-c"),
    ];
    const existing = [dbSection(1), dbSection(2)];
    const { toDelete } = computeSectionDiff(draft, existing);
    // Neither section 1 nor section 2 should be deleted â€” both are in the draft
    expect(toDelete).toHaveLength(0);
  });

  it("ignores null dbIds when building the surviving set (new sections do not protect existing ones)", () => {
    // One new draft section only; section 1 and 2 exist in DB but are not in draft
    const draft = [newDraft("local-c")];
    const existing = [dbSection(1), dbSection(2)];
    const { toDelete } = computeSectionDiff(draft, existing);
    // Both existing sections must be marked for deletion
    expect(toDelete).toContain(1);
    expect(toDelete).toContain(2);
    expect(toDelete).toHaveLength(2);
  });
});

describe("computeSectionDiff â€” Phase 2: sections to DELETE", () => {
  it("marks an existing section for deletion when it is absent from the draft", () => {
    // User removed section 2 from the form
    const draft = [existingDraft("local-a", 1)]; // only section 1 survives
    const existing = [dbSection(1), dbSection(2)];
    const { toDelete } = computeSectionDiff(draft, existing);
    expect(toDelete).toEqual([2]);
  });

  it("marks ALL existing sections for deletion when draft is empty", () => {
    const draft: DraftSection[] = [];
    const existing = [dbSection(1), dbSection(2), dbSection(3)];
    const { toDelete } = computeSectionDiff(draft, existing);
    expect(toDelete).toEqual(expect.arrayContaining([1, 2, 3]));
    expect(toDelete).toHaveLength(3);
  });

  it("produces an empty toDelete list when all existing sections survive", () => {
    const draft = [existingDraft("local-a", 1), existingDraft("local-b", 2)];
    const existing = [dbSection(1), dbSection(2)];
    const { toDelete } = computeSectionDiff(draft, existing);
    expect(toDelete).toHaveLength(0);
  });

  it("produces an empty toDelete list when there are no existing sections", () => {
    const draft = [newDraft("local-c")];
    const existing: RecipeSection[] = [];
    const { toDelete } = computeSectionDiff(draft, existing);
    expect(toDelete).toHaveLength(0);
  });
});

describe("computeSectionDiff â€” Phase 3: sections to UPDATE (dbId !== null)", () => {
  it("includes all surviving draft sections (dbId !== null) in toUpdate", () => {
    const draft = [
      existingDraft("local-a", 1),
      existingDraft("local-b", 2),
      newDraft("local-c"),
    ];
    const existing = [dbSection(1), dbSection(2)];
    const { toUpdate } = computeSectionDiff(draft, existing);
    expect(toUpdate).toHaveLength(2);
    expect(toUpdate.map((s) => s.dbId)).toEqual(expect.arrayContaining([1, 2]));
  });

  it("excludes new (dbId === null) sections from toUpdate", () => {
    const draft = [newDraft("local-c"), newDraft("local-d")];
    const existing: RecipeSection[] = [];
    const { toUpdate } = computeSectionDiff(draft, existing);
    expect(toUpdate).toHaveLength(0);
  });

  it("returns the full DraftSection object in toUpdate (not just the id)", () => {
    const section = existingDraft("local-a", 1, { name: "Custom Name" });
    const { toUpdate } = computeSectionDiff([section], [dbSection(1)]);
    expect(toUpdate[0].name).toBe("Custom Name");
    expect(toUpdate[0].localId).toBe("local-a");
  });
});

describe("computeSectionDiff â€” Phase 4: sections to INSERT (dbId === null)", () => {
  it("includes all new draft sections (dbId === null) in toInsert", () => {
    const draft = [
      existingDraft("local-a", 1),
      newDraft("local-c"),
      newDraft("local-d"),
    ];
    const existing = [dbSection(1)];
    const { toInsert } = computeSectionDiff(draft, existing);
    expect(toInsert).toHaveLength(2);
    expect(toInsert.map((s) => s.localId)).toEqual(expect.arrayContaining(["local-c", "local-d"]));
  });

  it("excludes surviving (dbId !== null) sections from toInsert", () => {
    const draft = [existingDraft("local-a", 1), existingDraft("local-b", 2)];
    const existing = [dbSection(1), dbSection(2)];
    const { toInsert } = computeSectionDiff(draft, existing);
    expect(toInsert).toHaveLength(0);
  });

  it("toInsert sections have dbId === null", () => {
    const draft = [newDraft("local-c"), newDraft("local-d")];
    const { toInsert } = computeSectionDiff(draft, []);
    for (const sec of toInsert) {
      expect(sec.dbId).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// buildSectionIdMap
// ---------------------------------------------------------------------------

describe("buildSectionIdMap â€” Phase 4 pure part", () => {
  it("seeds localId â†’ dbId for all non-null-dbId sections", () => {
    const sections = [
      existingDraft("local-a", 10),
      existingDraft("local-b", 20),
    ];
    const map = buildSectionIdMap(sections);
    expect(map.get("local-a")).toBe(10);
    expect(map.get("local-b")).toBe(20);
  });

  it("omits sections with dbId === null from the map", () => {
    const sections = [existingDraft("local-a", 10), newDraft("local-c")];
    const map = buildSectionIdMap(sections);
    expect(map.has("local-c")).toBe(false);
    expect(map.size).toBe(1);
  });

  it("returns an empty map when all sections are new", () => {
    const sections = [newDraft("local-c"), newDraft("local-d")];
    const map = buildSectionIdMap(sections);
    expect(map.size).toBe(0);
  });

  it("returns an empty map for an empty sections array", () => {
    const map = buildSectionIdMap([]);
    expect(map.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Gap 70-02-02: Step diff + edge cases
// ---------------------------------------------------------------------------

describe("computeStepDiff â€” Phase 5a: global surviving step dbIds (flatMap)", () => {
  it("collects step dbIds across ALL sections, not just a single section", () => {
    // Two sections each with one existing step
    const sectionA = existingDraft("sec-a", 1, {
      steps: [existingDraftStep("step-1", 101)],
    });
    const sectionB = existingDraft("sec-b", 2, {
      steps: [existingDraftStep("step-2", 102)],
    });
    const existing = [dbStep(101, 1), dbStep(102, 2)];
    const { toDelete } = computeStepDiff([sectionA, sectionB], existing);
    // Both steps survive â€” neither should be deleted
    expect(toDelete).toHaveLength(0);
  });

  it("a step with null dbId does NOT contribute to the surviving set", () => {
    // Section has only a new step (dbId=null); existing step 101 is gone
    const section = existingDraft("sec-a", 1, {
      steps: [newDraftStep("step-new")],
    });
    const existing = [dbStep(101, 1)];
    const { toDelete } = computeStepDiff([section], existing);
    expect(toDelete).toContain(101);
  });
});

describe("computeStepDiff â€” Phase 5b: steps to DELETE", () => {
  it("marks a step for deletion when it is absent from ALL draft sections", () => {
    // Step 101 existed but is not in the draft anymore
    const section = existingDraft("sec-a", 1, { steps: [] });
    const existing = [dbStep(101, 1)];
    const { toDelete } = computeStepDiff([section], existing);
    expect(toDelete).toEqual([101]);
  });

  it("does NOT mark a step for deletion when it survives in any section", () => {
    const section = existingDraft("sec-a", 1, {
      steps: [existingDraftStep("step-1", 101)],
    });
    const existing = [dbStep(101, 1)];
    const { toDelete } = computeStepDiff([section], existing);
    expect(toDelete).toHaveLength(0);
  });

  it("marks all removed steps when the draft is completely empty", () => {
    const section = existingDraft("sec-a", 1, { steps: [] });
    const existing = [dbStep(101, 1), dbStep(102, 1), dbStep(103, 1)];
    const { toDelete } = computeStepDiff([section], existing);
    expect(toDelete).toEqual(expect.arrayContaining([101, 102, 103]));
    expect(toDelete).toHaveLength(3);
  });

  it("produces empty toDelete when no existing steps are provided", () => {
    const section = existingDraft("sec-a", 1, {
      steps: [existingDraftStep("step-1", 101)],
    });
    const { toDelete } = computeStepDiff([section], []);
    expect(toDelete).toHaveLength(0);
  });
});

describe("computeStepDiff â€” Phase 5c: steps to UPDATE vs INSERT", () => {
  it("puts steps with dbId !== null into toUpdate", () => {
    const section = existingDraft("sec-a", 1, {
      steps: [existingDraftStep("step-1", 101), existingDraftStep("step-2", 102)],
    });
    const { toUpdate } = computeStepDiff([section], [dbStep(101), dbStep(102)]);
    expect(toUpdate).toHaveLength(2);
    expect(toUpdate.map((s) => s.dbId)).toEqual(expect.arrayContaining([101, 102]));
  });

  it("puts steps with dbId === null into toInsert", () => {
    const section = existingDraft("sec-a", 1, {
      steps: [newDraftStep("step-new-1"), newDraftStep("step-new-2")],
    });
    const { toInsert } = computeStepDiff([section], []);
    expect(toInsert).toHaveLength(2);
    for (const st of toInsert) {
      expect(st.dbId).toBeNull();
    }
  });

  it("correctly splits a mixed section (some old, some new steps)", () => {
    const section = existingDraft("sec-a", 1, {
      steps: [
        existingDraftStep("step-old", 101),
        newDraftStep("step-new"),
      ],
    });
    const { toUpdate, toInsert } = computeStepDiff([section], [dbStep(101)]);
    expect(toUpdate).toHaveLength(1);
    expect(toUpdate[0].dbId).toBe(101);
    expect(toInsert).toHaveLength(1);
    expect(toInsert[0].dbId).toBeNull();
  });
});

describe("computeStepDiff â€” cross-section drag edge case (D-12)", () => {
  it("does NOT delete a step dragged from section A to section B", () => {
    // Step 101 originated in section A (dbId 1) but is now in section B (dbId 2) in the draft.
    // existingSteps still shows section_id=1 (old DB state).
    // The GLOBAL draftStepDbIds set must catch step 101 regardless of which section it is in now.
    const sectionA = existingDraft("sec-a", 1, {
      steps: [], // step 101 was dragged out
    });
    const sectionB = existingDraft("sec-b", 2, {
      steps: [existingDraftStep("step-1", 101)], // step 101 is now here
    });
    const existing = [
      dbStep(101, 1), // DB still says section_id=1
    ];
    const { toDelete } = computeStepDiff([sectionA, sectionB], existing);
    // Step 101 must NOT be deleted â€” it is in section B's draft
    expect(toDelete).not.toContain(101);
    expect(toDelete).toHaveLength(0);
  });

  it("correctly deletes a step that was removed while another step was dragged", () => {
    // Step 101 dragged from A to B; step 102 was just removed entirely.
    const sectionA = existingDraft("sec-a", 1, {
      steps: [], // 101 moved, 102 deleted
    });
    const sectionB = existingDraft("sec-b", 2, {
      steps: [existingDraftStep("step-1", 101)],
    });
    const existing = [
      dbStep(101, 1),
      dbStep(102, 1),
    ];
    const { toDelete } = computeStepDiff([sectionA, sectionB], existing);
    expect(toDelete).not.toContain(101); // survived in section B
    expect(toDelete).toContain(102);     // genuinely deleted
    expect(toDelete).toHaveLength(1);
  });

  it("annotates each toUpdate step with its sectionLocalId for FK lookup", () => {
    // The caller needs sectionLocalId to look up dbSectionId from sectionIdMap
    const sectionB = existingDraft("sec-b", 2, {
      steps: [existingDraftStep("step-1", 101)],
    });
    const { toUpdate } = computeStepDiff([sectionB], []);
    expect(toUpdate[0].sectionLocalId).toBe("sec-b");
  });
});
