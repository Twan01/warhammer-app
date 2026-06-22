/**
 * Pure preview-diff for the technique resync confirmation dialog (v0.7.0 Phase 144, LINK-03).
 *
 * previewTechniqueResyncDiff computes — without any DB access — what structural
 * changes a technique edit will propagate to its linked recipe instances when
 * resyncTechniqueInstances runs after save.
 *
 * Design notes:
 *  - Reuses computeStepDiff from recipeDiff.ts (structurally compatible with
 *    DraftTechniqueSection per techniqueDiff.ts line 13 re-export note).
 *  - isStructural is true iff any of the five counts > 0.  A pure metadata edit
 *    (rename / notes change on existing steps with same order) correctly returns
 *    isStructural === false — no confirmation dialog is shown (Pitfall 4).
 *  - NO DB access, NO getDb(), NO async — pure transform only.
 */

import type { DraftTechniqueSection, TechniqueSection, TechniqueStep } from "@/types/technique";
import { computeStepDiff } from "@/lib/recipeDiff";

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface TechniqueResyncPreview {
  /** Draft steps with dbId === null (new steps added to the technique). */
  stepAdds: number;
  /** Existing technique_steps not present in any draft section (will be removed). */
  stepRemoves: number;
  /** Surviving steps whose flat draft position differs from their existing order_index. */
  stepReorders: number;
  /** Draft sections with dbId === null (new sections added to the technique). */
  sectionAdds: number;
  /** Existing sections absent from the draft survivor dbId set (will be removed). */
  sectionRemoves: number;
  /** true if any of the five counts above > 0; false for pure metadata edits. */
  isStructural: boolean;
}

// ---------------------------------------------------------------------------
// Pure diff function
// ---------------------------------------------------------------------------

/**
 * Computes the structural diff between the draft technique and the persisted technique.
 *
 * @param draftSections   - The current form state sections (from the technique editor)
 * @param existingSections - The persisted TechniqueSection[] rows from DB
 * @param existingSteps   - The persisted TechniqueStep[] rows from DB (all sections)
 * @returns TechniqueResyncPreview with per-type counts and an isStructural flag
 */
export function previewTechniqueResyncDiff(
  draftSections: DraftTechniqueSection[],
  existingSections: TechniqueSection[],
  existingSteps: TechniqueStep[],
): TechniqueResyncPreview {
  // ── Step diff — reuse computeStepDiff from recipeDiff.ts ────────────────────
  // computeStepDiff accepts DraftSection[] which is structurally compatible with
  // DraftTechniqueSection[] (both have localId, dbId, steps[].localId, steps[].dbId).
  // The cast is safe: computeStepDiff only reads localId, dbId, and steps[].dbId.
  const { toDelete: stepsToDelete, toUpdate: stepsToUpdate, toInsert: stepsToInsert } =
    computeStepDiff(draftSections as never, existingSteps as never);

  // ── Reorder detection ────────────────────────────────────────────────────────
  // For each surviving step (in toUpdate), compute its flat draft position
  // and compare against its existing order_index.  If they differ, it's a reorder.
  const stepReorders = stepsToUpdate.filter((draftStep) => {
    const existing = existingSteps.find((s) => s.id === draftStep.dbId);
    if (!existing) return false;

    // Walk the flat draft step list to find this step's position
    let pos = 0;
    for (const sec of draftSections) {
      for (const st of sec.steps) {
        if (st.dbId === draftStep.dbId) {
          return existing.order_index !== pos;
        }
        pos++;
      }
    }
    return false;
  }).length;

  // ── Section diff ─────────────────────────────────────────────────────────────
  // Mirrors computeSectionDiff logic from recipeDiff.ts but returns counts only.
  const survivingSectionDbIds = new Set(
    draftSections
      .map((s) => s.dbId)
      .filter((id): id is number => id !== null),
  );
  const sectionRemoves = existingSections.filter((s) => !survivingSectionDbIds.has(s.id)).length;
  const sectionAdds = draftSections.filter((s) => s.dbId === null).length;

  // ── isStructural ─────────────────────────────────────────────────────────────
  const isStructural =
    stepsToDelete.length > 0 ||
    stepsToInsert.length > 0 ||
    stepReorders > 0 ||
    sectionRemoves > 0 ||
    sectionAdds > 0;

  return {
    stepAdds: stepsToInsert.length,
    stepRemoves: stepsToDelete.length,
    stepReorders,
    sectionAdds,
    sectionRemoves,
    isStructural,
  };
}
