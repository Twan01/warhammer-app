/**
 * Diff utilities for the non-destructive technique save flow (Phase 142, TECH-02).
 *
 * Re-exports computeSectionDiff, computeStepDiff, buildSectionIdMap from recipeDiff.ts
 * (structural typing makes them compatible with DraftTechniqueSection / DraftTechniqueStep).
 *
 * Adds computeSlotDiff + buildSlotIdMap for the colour slot phase — a new concept
 * not present in the recipe layer.
 */

// Re-export the three functions from recipeDiff — structurally compatible with
// DraftTechniqueSection (both have localId, dbId, steps[].localId, steps[].dbId).
export {
  computeSectionDiff,
  computeStepDiff,
  buildSectionIdMap,
} from "@/lib/recipeDiff";

import type { DraftTechniqueSlot } from "@/types/technique";
import type { TechniqueColourSlot } from "@/types/technique";

// ---------------------------------------------------------------------------
// Slot diff
// ---------------------------------------------------------------------------

export interface SlotDiff {
  /** DB ids of slots not in the current draft — caller should DELETE */
  toDelete: number[];
  /** Draft slots with dbId !== null — caller should UPDATE */
  toUpdate: DraftTechniqueSlot[];
  /** Draft slots with dbId === null — caller should INSERT */
  toInsert: DraftTechniqueSlot[];
}

/**
 * Computes which existing colour slots to delete, which draft slots to update,
 * and which draft slots to insert, based on the presence of dbId.
 *
 * Mirrors computeStepDiff structure but for the flat slot list (not nested under sections).
 *
 * Phase A: Build a Set of all non-null dbId values in draftSlots.
 * Phase B: Any id in existingSlots NOT in that Set -> toDelete.
 * Phase C: Draft slots with dbId !== null -> toUpdate.
 * Phase D: Draft slots with dbId === null -> toInsert.
 */
export function computeSlotDiff(
  draftSlots: DraftTechniqueSlot[],
  existingSlots: TechniqueColourSlot[],
): SlotDiff {
  // Phase A — surviving slot dbIds
  const survivingDbIds = new Set(
    draftSlots
      .map((s) => s.dbId)
      .filter((id): id is number => id !== null),
  );

  // Phase B — slots to DELETE
  const toDelete = existingSlots
    .filter((s) => !survivingDbIds.has(s.id))
    .map((s) => s.id);

  // Phase C — slots to UPDATE (have a dbId)
  const toUpdate = draftSlots.filter((s) => s.dbId !== null);

  // Phase D — slots to INSERT (no dbId yet)
  const toInsert = draftSlots.filter((s) => s.dbId === null);

  return { toDelete, toUpdate, toInsert };
}

/**
 * Seeds a localId -> dbId map from the persisted (non-null dbId) slots.
 *
 * Used at save time to resolve DraftTechniqueStep.colour_slot_id (a localId string)
 * to an integer FK for technique_steps.colour_slot_id. New slots get their DB ids
 * added to the same map by the caller after INSERT.
 */
export function buildSlotIdMap(slots: DraftTechniqueSlot[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const slot of slots) {
    if (slot.dbId !== null) {
      map.set(slot.localId, slot.dbId);
    }
  }
  return map;
}
