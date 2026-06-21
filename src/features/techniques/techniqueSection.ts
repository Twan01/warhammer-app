/**
 * Draft-section helpers for the technique form state.
 *
 * Mirrors src/features/recipes/recipeSection.ts but adapted for the technique domain:
 * - No section_type / technique / execution_mode / applies_to fields on sections
 * - Steps carry colour_slot_id (string | null, referencing DraftTechniqueSlot.localId)
 *   instead of paint_id / alt_paint_id / step_photo_path
 *
 * Phase 142, Plan 01.
 */

import type {
  DraftTechniqueSlot,
  DraftTechniqueStep,
  DraftTechniqueSection,
  TechniqueColourSlot,
  TechniqueSection,
  TechniqueStep,
} from "@/types/technique";

// Re-export draft types for consumers that import from here
export type {
  DraftTechniqueSlot,
  DraftTechniqueStep,
  DraftTechniqueSection,
} from "@/types/technique";

// ---------------------------------------------------------------------------
// buildDraftTechniqueSlots — convert DB slot rows to draft state
// ---------------------------------------------------------------------------

/**
 * Converts DB TechniqueColourSlot rows to DraftTechniqueSlot form state.
 * Each draft slot receives a fresh UUID localId used as React key + DnD id +
 * slotIdMap key. The dbId is set to the slot's DB integer PK.
 *
 * This function must be called BEFORE buildDraftTechniqueSections so the
 * resulting DraftTechniqueSlot[] can seed the slotDbIdToLocalId lookup.
 */
export function buildDraftTechniqueSlots(
  slots: TechniqueColourSlot[],
): DraftTechniqueSlot[] {
  return slots
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map(
      (s): DraftTechniqueSlot => ({
        localId: crypto.randomUUID(),
        dbId: s.id,
        name: s.name,
        role_hint: s.role_hint,
        order_index: s.order_index,
      }),
    );
}

// ---------------------------------------------------------------------------
// makeDraftTechniqueSection — factory for a new empty section
// ---------------------------------------------------------------------------

/**
 * Returns a new empty technique section draft with a fresh localId.
 * Intentionally omits section_type / technique / execution_mode / applies_to —
 * these fields exist on recipe_sections but NOT on technique_sections (migration 051).
 */
export function makeDraftTechniqueSection(name = "Steps"): DraftTechniqueSection {
  return {
    localId: crypto.randomUUID(),
    dbId: null,
    name,
    surface: null,
    optional: 0,
    notes: null,
    steps: [],
  };
}

// ---------------------------------------------------------------------------
// buildDraftTechniqueSections — convert DB rows to draft state
// ---------------------------------------------------------------------------

/**
 * Groups TechniqueStep rows into DraftTechniqueSections, preserving section
 * order and sorting steps by order_index within each section.
 *
 * Assigns fresh UUID localIds to both sections and nested steps so they can
 * be used as stable React keys and DnD identifiers.
 *
 * The step's DB integer colour_slot_id is mapped back to the corresponding
 * DraftTechniqueSlot.localId via the slotDbIdToLocalId map (built from the
 * draftSlots list before calling this function). If the slot id is not in
 * the map (null or no matching slot), colour_slot_id is set to null.
 *
 * @param sections  - Ordered TechniqueSection rows from the DB
 * @param steps     - All TechniqueStep rows for the technique (any order)
 * @param draftSlots - Draft slots already built via buildDraftTechniqueSlots
 */
export function buildDraftTechniqueSections(
  sections: TechniqueSection[],
  steps: TechniqueStep[],
  draftSlots: DraftTechniqueSlot[],
): DraftTechniqueSection[] {
  // Build reverse map: DB slot integer id → draft slot localId
  const slotDbIdToLocalId = new Map<number, string>();
  for (const slot of draftSlots) {
    if (slot.dbId !== null) {
      slotDbIdToLocalId.set(slot.dbId, slot.localId);
    }
  }

  return sections
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((s) => {
      const sectionSteps = steps
        .filter((st) => st.technique_section_id === s.id)
        .sort((a, b) => a.order_index - b.order_index)
        .map(
          (st): DraftTechniqueStep => ({
            localId: crypto.randomUUID(),
            dbId: st.id,
            step_name: st.step_name,
            // Resolve DB integer colour_slot_id → draft slot localId (or null)
            colour_slot_id:
              st.colour_slot_id !== null
                ? (slotDbIdToLocalId.get(st.colour_slot_id) ?? null)
                : null,
            notes: st.notes,
            painting_phase: st.painting_phase,
            tool: st.tool,
            technique: st.technique,
            dilution: st.dilution,
            time_estimate_minutes: st.time_estimate_minutes,
          }),
        );

      return {
        localId: crypto.randomUUID(),
        dbId: s.id,
        name: s.name,
        surface: s.surface,
        optional: s.optional,
        notes: s.notes,
        steps: sectionSteps,
      };
    });
}
