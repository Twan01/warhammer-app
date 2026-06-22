// @vitest-environment node

/**
 * LINK-03 unit tests: previewTechniqueResyncDiff pure function.
 *
 * Covers:
 *  - stepAdds: draft steps with dbId === null
 *  - stepRemoves: existing steps not in any draft section
 *  - stepReorders: surviving steps whose flat position changed
 *  - sectionAdds: draft sections with dbId === null
 *  - sectionRemoves: existing sections absent from draft survivor set
 *  - isStructural: true when any count > 0, false for pure metadata edits (Pitfall 4)
 *
 * Pure function — no DB access, no Tauri bridge needed.
 */

import { describe, it, expect } from "vitest";
import { previewTechniqueResyncDiff } from "@/lib/techniquePreviewDiff";
import type { DraftTechniqueSection, TechniqueSection, TechniqueStep } from "@/types/technique";

// ---------------------------------------------------------------------------
// Minimal fixture builders
// ---------------------------------------------------------------------------

function makeExistingSection(id: number, order_index: number): TechniqueSection {
  return {
    id,
    technique_id: 1,
    name: `Section ${id}`,
    surface: null,
    optional: 0,
    order_index,
    notes: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  };
}

function makeExistingStep(id: number, technique_section_id: number, order_index: number): TechniqueStep {
  return {
    id,
    technique_section_id,
    colour_slot_id: null,
    step_name: `Step ${id}`,
    order_index,
    notes: null,
    painting_phase: null,
    tool: null,
    technique: null,
    dilution: null,
    time_estimate_minutes: null,
    created_at: "2026-01-01",
  };
}

function makeDraftSection(
  dbId: number | null,
  localId: string,
  steps: Array<{ dbId: number | null; localId: string; step_name?: string }>,
): DraftTechniqueSection {
  return {
    localId,
    dbId,
    name: `Draft Section ${localId}`,
    surface: null,
    optional: 0,
    notes: null,
    steps: steps.map((s) => ({
      localId: s.localId,
      dbId: s.dbId,
      step_name: s.step_name ?? `Draft Step ${s.localId}`,
      colour_slot_id: null,
      notes: null,
      painting_phase: null,
      tool: null,
      technique: null,
      dilution: null,
      time_estimate_minutes: null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("previewTechniqueResyncDiff (LINK-03)", () => {

  it("returns all zeros for an identical structure (no changes)", () => {
    const existingSections = [makeExistingSection(10, 0)];
    const existingSteps = [
      makeExistingStep(100, 10, 0),
      makeExistingStep(101, 10, 1),
    ];
    const draftSections = [
      makeDraftSection(10, "s1", [
        { dbId: 100, localId: "st1" },
        { dbId: 101, localId: "st2" },
      ]),
    ];

    const result = previewTechniqueResyncDiff(draftSections, existingSections, existingSteps);

    expect(result.stepAdds).toBe(0);
    expect(result.stepRemoves).toBe(0);
    expect(result.stepReorders).toBe(0);
    expect(result.sectionAdds).toBe(0);
    expect(result.sectionRemoves).toBe(0);
    expect(result.isStructural).toBe(false);
  });

  it("stepAdds: draft steps with dbId === null → counted as adds", () => {
    const existingSections = [makeExistingSection(10, 0)];
    const existingSteps: TechniqueStep[] = [];
    const draftSections = [
      makeDraftSection(10, "s1", [
        { dbId: null, localId: "new1" },
        { dbId: null, localId: "new2" },
      ]),
    ];

    const result = previewTechniqueResyncDiff(draftSections, existingSections, existingSteps);

    expect(result.stepAdds).toBe(2);
    expect(result.stepRemoves).toBe(0);
    expect(result.isStructural).toBe(true);
  });

  it("stepRemoves: existing steps not in any draft section → counted as removes", () => {
    const existingSections = [makeExistingSection(10, 0)];
    const existingSteps = [
      makeExistingStep(100, 10, 0),
      makeExistingStep(101, 10, 1),
    ];
    // Draft only keeps step 100; step 101 is removed
    const draftSections = [
      makeDraftSection(10, "s1", [
        { dbId: 100, localId: "st1" },
      ]),
    ];

    const result = previewTechniqueResyncDiff(draftSections, existingSections, existingSteps);

    expect(result.stepAdds).toBe(0);
    expect(result.stepRemoves).toBe(1);
    expect(result.isStructural).toBe(true);
  });

  it("add + remove together: stepAdds===1, stepRemoves===1, isStructural===true", () => {
    const existingSections = [makeExistingSection(10, 0)];
    const existingSteps = [makeExistingStep(100, 10, 0)];
    // Remove step 100, add a new step
    const draftSections = [
      makeDraftSection(10, "s1", [
        { dbId: null, localId: "new1" },
      ]),
    ];

    const result = previewTechniqueResyncDiff(draftSections, existingSections, existingSteps);

    expect(result.stepAdds).toBe(1);
    expect(result.stepRemoves).toBe(1);
    expect(result.isStructural).toBe(true);
  });

  it("stepReorders: swapping two steps changes their flat position → stepReorders > 0", () => {
    const existingSections = [makeExistingSection(10, 0)];
    // Existing: step 100 at position 0, step 101 at position 1
    const existingSteps = [
      makeExistingStep(100, 10, 0),
      makeExistingStep(101, 10, 1),
    ];
    // Draft: swapped — step 101 first, step 100 second
    const draftSections = [
      makeDraftSection(10, "s1", [
        { dbId: 101, localId: "st2" },
        { dbId: 100, localId: "st1" },
      ]),
    ];

    const result = previewTechniqueResyncDiff(draftSections, existingSections, existingSteps);

    expect(result.stepReorders).toBeGreaterThan(0);
    expect(result.isStructural).toBe(true);
  });

  it("sectionAdds: draft section with dbId === null → counted as add", () => {
    const existingSections = [makeExistingSection(10, 0)];
    const existingSteps: TechniqueStep[] = [];
    const draftSections = [
      makeDraftSection(10, "s1", []),
      makeDraftSection(null, "s-new", []),  // new section
    ];

    const result = previewTechniqueResyncDiff(draftSections, existingSections, existingSteps);

    expect(result.sectionAdds).toBe(1);
    expect(result.isStructural).toBe(true);
  });

  it("sectionRemoves: existing section absent from draft survivor set → counted as remove", () => {
    const existingSections = [
      makeExistingSection(10, 0),
      makeExistingSection(11, 1),
    ];
    const existingSteps: TechniqueStep[] = [];
    // Draft only has section 10; section 11 is removed
    const draftSections = [
      makeDraftSection(10, "s1", []),
    ];

    const result = previewTechniqueResyncDiff(draftSections, existingSections, existingSteps);

    expect(result.sectionRemoves).toBe(1);
    expect(result.isStructural).toBe(true);
  });

  it("metadata-only rename: same step set, only step_name changed → all counts 0, isStructural===false (Pitfall 4)", () => {
    const existingSections = [makeExistingSection(10, 0)];
    const existingSteps = [
      makeExistingStep(100, 10, 0),
      makeExistingStep(101, 10, 1),
    ];
    // Same steps, same order, but different names (metadata only)
    const draftSections = [
      makeDraftSection(10, "s1", [
        { dbId: 100, localId: "st1", step_name: "Renamed Step A" },
        { dbId: 101, localId: "st2", step_name: "Renamed Step B" },
      ]),
    ];

    const result = previewTechniqueResyncDiff(draftSections, existingSections, existingSteps);

    expect(result.stepAdds).toBe(0);
    expect(result.stepRemoves).toBe(0);
    expect(result.stepReorders).toBe(0);
    expect(result.sectionAdds).toBe(0);
    expect(result.sectionRemoves).toBe(0);
    expect(result.isStructural).toBe(false);
  });

  it("exports TechniqueResyncPreview interface members (type shape check)", () => {
    const existingSections: TechniqueSection[] = [];
    const existingSteps: TechniqueStep[] = [];
    const draftSections: DraftTechniqueSection[] = [];

    const result = previewTechniqueResyncDiff(draftSections, existingSections, existingSteps);

    // Verify all expected fields exist
    expect(typeof result.stepAdds).toBe("number");
    expect(typeof result.stepRemoves).toBe("number");
    expect(typeof result.stepReorders).toBe("number");
    expect(typeof result.sectionAdds).toBe("number");
    expect(typeof result.sectionRemoves).toBe("number");
    expect(typeof result.isStructural).toBe("boolean");
  });

  it("WR-01: multi-section no-op — steps in same per-section position → stepReorders===0", () => {
    // Two sections: [A1(order 0), A2(order 1)] and [B1(order 0), B2(order 1)]
    // No structural change — draft mirrors persisted exactly.
    // Before WR-01 fix, flat pos for B1 was 2, compared against order_index 0 → false positive.
    const existingSections = [
      makeExistingSection(10, 0),
      makeExistingSection(11, 1),
    ];
    const existingSteps = [
      makeExistingStep(100, 10, 0), // A1 — section 10, pos 0
      makeExistingStep(101, 10, 1), // A2 — section 10, pos 1
      makeExistingStep(102, 11, 0), // B1 — section 11, pos 0
      makeExistingStep(103, 11, 1), // B2 — section 11, pos 1
    ];
    const draftSections = [
      makeDraftSection(10, "s1", [
        { dbId: 100, localId: "a1" },
        { dbId: 101, localId: "a2" },
      ]),
      makeDraftSection(11, "s2", [
        { dbId: 102, localId: "b1" },
        { dbId: 103, localId: "b2" },
      ]),
    ];

    const result = previewTechniqueResyncDiff(draftSections, existingSections, existingSteps);

    expect(result.stepReorders).toBe(0);
    expect(result.isStructural).toBe(false);
  });


});