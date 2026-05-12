/**
 * DraftSection type and pure helper functions for recipe section form state.
 *
 * FORM-05, FORM-06 — Phase 50, Plan 01.
 *
 * These functions convert DB-level RecipeSection[] + RecipeStep[] into the
 * draft state model used by the section form (manual useState pattern;
 * useFieldArray is NOT used — see project decision RHF #10607).
 */
import type { DraftStep } from "./recipeSteps";
import type { RecipeSection } from "@/types/recipeSection";
import type { RecipeStep } from "@/types/recipePaint";

// ---------------------------------------------------------------------------
// DraftSection — form-level representation of a recipe section
// ---------------------------------------------------------------------------

export interface DraftSection {
  /** UUID assigned at draft creation; never stored in DB */
  localId: string;
  name: string;
  surface: string | null;
  /** 0 = required, 1 = skippable */
  optional: number;
  notes: string | null;
  // Phase 57 — workflow metadata (WF-01..04)
  section_type: string | null;
  technique: string | null;
  execution_mode: string | null;
  applies_to: string | null;
  steps: DraftStep[];
}

// ---------------------------------------------------------------------------
// makeDraftSection — factory for a new empty section
// ---------------------------------------------------------------------------

export function makeDraftSection(name = "Steps"): DraftSection {
  return {
    localId: crypto.randomUUID(),
    name,
    surface: null,
    optional: 0,
    notes: null,
    section_type: null,
    technique: null,
    execution_mode: null,
    applies_to: null,
    steps: [],
  };
}

// ---------------------------------------------------------------------------
// buildDraftSections — convert DB rows to draft state
// ---------------------------------------------------------------------------

/**
 * Groups RecipeStep rows into DraftSections, preserving section order and
 * sorting steps by order_index within each section.
 *
 * Assigns fresh UUID localIds to both sections and nested steps so they can
 * be used as stable React keys and DnD identifiers.
 *
 * @param sections - Ordered RecipeSection rows from the DB
 * @param steps    - All RecipeStep rows for the recipe (any order)
 */
export function buildDraftSections(
  sections: RecipeSection[],
  steps: RecipeStep[],
): DraftSection[] {
  return sections.map((s) => {
    const sectionSteps = steps
      .filter((st) => st.section_id === s.id)
      .sort((a, b) => a.order_index - b.order_index)
      .map(
        (st): DraftStep => ({
          localId: crypto.randomUUID(),
          step_name: st.step_name,
          paint_id: st.paint_id,
          notes: st.notes,
          painting_phase: st.painting_phase ?? null,
          tool: st.tool ?? null,
          technique: st.technique ?? null,
          dilution: st.dilution ?? null,
          time_estimate_minutes: st.time_estimate_minutes ?? null,
          step_photo_path: st.step_photo_path ?? null,
          alt_paint_id: st.alt_paint_id ?? null,
        }),
      );

    return {
      localId: crypto.randomUUID(),
      name: s.name,
      surface: s.surface,
      optional: s.optional,
      notes: s.notes,
      section_type: s.section_type ?? null,
      technique: s.technique ?? null,
      execution_mode: s.execution_mode ?? null,
      applies_to: s.applies_to ?? null,
      steps: sectionSteps,
    };
  });
}
