/**
 * Pure diff utilities for the non-destructive recipe save flow (Phase 70, REC-02).
 *
 * These functions contain no async logic, no DB calls, and no React — they are
 * purely set-difference computations that transform draft form state into three
 * change lists: toDelete, toUpdate, toInsert.
 *
 * Extracted from RecipeFormSheet.tsx onSubmit so they can be unit-tested without
 * mocking the DB or the Tauri bridge.
 */

import type { DraftSection } from "./recipeSection";
import type { RecipeSection } from "@/types/recipeSection";
import type { RecipeStep } from "@/types/recipePaint";

// ---------------------------------------------------------------------------
// Section diff
// ---------------------------------------------------------------------------

export interface SectionDiff {
  /** DB ids of sections that no longer appear in the draft — caller should DELETE */
  toDelete: number[];
  /** Draft sections that have a dbId (they existed before) — caller should UPDATE */
  toUpdate: DraftSection[];
  /** Draft sections without a dbId (they are new) — caller should INSERT */
  toInsert: DraftSection[];
}

/**
 * Computes which existing sections to delete, which draft sections to update,
 * and which draft sections to insert, based on the presence of `dbId`.
 *
 * Phase 1: Build a Set of all non-null dbId values in `draftSections`.
 * Phase 2: Any id in `existingSections` NOT in that Set → toDelete.
 * Phase 3: Any draft section with dbId !== null → toUpdate.
 * Phase 4: Any draft section with dbId === null → toInsert.
 */
export function computeSectionDiff(
  draftSections: DraftSection[],
  existingSections: RecipeSection[],
): SectionDiff {
  // Phase 1 — surviving section dbIds
  const survivingDbIds = new Set(
    draftSections
      .map((s) => s.dbId)
      .filter((id): id is number => id !== null),
  );

  // Phase 2 — sections to DELETE
  const toDelete = existingSections
    .filter((s) => !survivingDbIds.has(s.id))
    .map((s) => s.id);

  // Phase 3 — sections to UPDATE (have a dbId)
  const toUpdate = draftSections.filter((s) => s.dbId !== null);

  // Phase 4 — sections to INSERT (no dbId yet)
  const toInsert = draftSections.filter((s) => s.dbId === null);

  return { toDelete, toUpdate, toInsert };
}

// ---------------------------------------------------------------------------
// sectionIdMap builder
// ---------------------------------------------------------------------------

/**
 * Seeds a localId → dbId map from the surviving (non-null dbId) sections.
 *
 * This is the pure part of Phase 4 in the save flow. New sections get their
 * DB ids added to the same map by the caller after INSERT, but this function
 * provides the initial snapshot so step processing can look up section ids
 * without waiting for new-section inserts to complete.
 */
export function buildSectionIdMap(sections: DraftSection[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const sec of sections) {
    if (sec.dbId !== null) {
      map.set(sec.localId, sec.dbId);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Step diff
// ---------------------------------------------------------------------------

/** A DraftStep (from any section) annotated with the section it belongs to. */
export interface FlatDraftStep {
  localId: string;
  dbId: number | null;
  sectionLocalId: string;
  step_name: string;
  paint_id: number | null;
  notes: string | null;
  painting_phase: string | null;
  tool: string | null;
  technique: string | null;
  dilution: string | null;
  time_estimate_minutes: number | null;
  step_photo_path: string | null;
  alt_paint_id: number | null;
}

export interface StepDiff {
  /** DB ids of steps that no longer appear in ANY draft section — caller should DELETE */
  toDelete: number[];
  /** Flat draft steps that have a dbId — caller should UPDATE */
  toUpdate: FlatDraftStep[];
  /** Flat draft steps without a dbId — caller should INSERT */
  toInsert: FlatDraftStep[];
}

/**
 * Computes which existing steps to delete, which to update, and which to insert,
 * using a GLOBAL scan across ALL sections.
 *
 * Phase 5a: flatMap all draft sections' steps with their sectionLocalId; collect
 *           all non-null dbId values into a Set (global, not per-section — this
 *           prevents a step dragged from section A to B from being falsely deleted).
 * Phase 5b: Any id in `existingSteps` NOT in that global Set → toDelete.
 * Phase 5c: Flat steps with dbId !== null → toUpdate; dbId === null → toInsert.
 */
export function computeStepDiff(
  draftSections: DraftSection[],
  existingSteps: RecipeStep[],
): StepDiff {
  // Phase 5a — flatten steps across ALL sections
  const flatSteps: FlatDraftStep[] = draftSections.flatMap((sec) =>
    sec.steps.map((st) => ({
      localId: st.localId,
      dbId: st.dbId,
      sectionLocalId: sec.localId,
      step_name: st.step_name,
      paint_id: st.paint_id,
      notes: st.notes,
      painting_phase: st.painting_phase,
      tool: st.tool,
      technique: st.technique,
      dilution: st.dilution,
      time_estimate_minutes: st.time_estimate_minutes,
      step_photo_path: st.step_photo_path,
      alt_paint_id: st.alt_paint_id,
    })),
  );

  // Global surviving step dbIds
  const survivingDbIds = new Set(
    flatSteps
      .map((st) => st.dbId)
      .filter((id): id is number => id !== null),
  );

  // Phase 5b — steps to DELETE
  const toDelete = existingSteps
    .filter((st) => !survivingDbIds.has(st.id))
    .map((st) => st.id);

  // Phase 5c — steps to UPDATE vs INSERT
  const toUpdate = flatSteps.filter((st) => st.dbId !== null);
  const toInsert = flatSteps.filter((st) => st.dbId === null);

  return { toDelete, toUpdate, toInsert };
}
