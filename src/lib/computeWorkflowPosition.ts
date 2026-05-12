/**
 * Phase 60 — Workflow position derivation (PROJ-03/04).
 *
 * Pure function that computes a user's current position in a multi-section
 * recipe from their last logged painting session. Consumed by both
 * KanbanCard (D-06) and CurrentFocusCard (D-07).
 *
 * Degradation rules (D-15 through D-19):
 *  - No step or section info → null
 *  - Flat recipe (no sections) → step-only position
 *  - Orphaned step ID → fallback to section_name match
 *  - Section name only → section-level position
 */
import type { RecipeSection } from "@/types/recipeSection";
import type { RecipeStep } from "@/types/recipePaint";

export interface WorkflowPosition {
  sectionName: string | null;
  sectionIndex: number | null;
  totalSections: number;
  stepName: string | null;
  stepIndex: number | null;
  totalSteps: number;
  technique: string | null;
  isComplete: boolean;
  nextStepName: string | null;
}

export function computeWorkflowPosition(
  lastSessionStepId: number | null,
  lastSessionSectionName: string | null,
  sections: RecipeSection[],
  steps: RecipeStep[],
): WorkflowPosition | null {
  // D-05: nothing to derive from
  if (lastSessionStepId === null && lastSessionSectionName === null) return null;
  if (steps.length === 0) return null;

  const sortedSections = [...sections].sort(
    (a, b) => a.order_index - b.order_index,
  );

  // Case 1: We have a step ID — find it in the steps array
  if (lastSessionStepId !== null) {
    const step = steps.find((s) => s.id === lastSessionStepId);

    if (step) {
      // D-17: Flat recipe (no sections)
      if (sortedSections.length === 0) {
        const sortedSteps = [...steps].sort(
          (a, b) => a.order_index - b.order_index,
        );
        const flatIdx = sortedSteps.findIndex(
          (s) => s.id === lastSessionStepId,
        );
        const isLast = flatIdx === sortedSteps.length - 1;
        return {
          sectionName: null,
          sectionIndex: null,
          totalSections: 0,
          stepName: step.step_name,
          stepIndex: flatIdx,
          totalSteps: sortedSteps.length,
          technique: null,
          isComplete: isLast,
          nextStepName: isLast ? null : sortedSteps[flatIdx + 1].step_name,
        };
      }

      // D-18: Sectioned recipe — find owning section via step.section_id
      const section = sortedSections.find((s) => s.id === step.section_id);
      if (section) {
        const sectionIdx = sortedSections.indexOf(section);
        const sectionSteps = steps
          .filter((s) => s.section_id === section.id)
          .sort((a, b) => a.order_index - b.order_index);
        const stepInSection = sectionSteps.findIndex(
          (s) => s.id === lastSessionStepId,
        );
        const isLastStep = stepInSection === sectionSteps.length - 1;
        const isLastSection = sectionIdx === sortedSections.length - 1;
        const isComplete = isLastStep && isLastSection;

        // D-03: next step logic
        let nextStepName: string | null = null;
        if (!isComplete) {
          if (!isLastStep) {
            nextStepName = sectionSteps[stepInSection + 1].step_name;
          } else {
            // First step of next section
            const nextSection = sortedSections[sectionIdx + 1];
            const nextSectionSteps = steps
              .filter((s) => s.section_id === nextSection.id)
              .sort((a, b) => a.order_index - b.order_index);
            nextStepName = nextSectionSteps[0]?.step_name ?? null;
          }
        }

        return {
          sectionName: section.name,
          sectionIndex: sectionIdx,
          totalSections: sortedSections.length,
          stepName: step.step_name,
          stepIndex: stepInSection,
          totalSteps: sectionSteps.length,
          technique: section.technique ?? null,
          isComplete,
          nextStepName,
        };
      }
    }
    // Step not found (Pitfall 5) or section not found — fall through to section_name
  }

  // D-04: section_name only (no valid step ID)
  if (lastSessionSectionName !== null && sortedSections.length > 0) {
    const section = sortedSections.find(
      (s) => s.name === lastSessionSectionName,
    );
    if (section) {
      const sectionIdx = sortedSections.indexOf(section);
      const sectionSteps = steps
        .filter((s) => s.section_id === section.id)
        .sort((a, b) => a.order_index - b.order_index);
      return {
        sectionName: section.name,
        sectionIndex: sectionIdx,
        totalSections: sortedSections.length,
        stepName: null,
        stepIndex: null,
        totalSteps: sectionSteps.length,
        technique: section.technique ?? null,
        isComplete: false,
        nextStepName: null,
      };
    }
  }

  return null;
}
