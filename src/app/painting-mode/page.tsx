import { useParams, useNavigate } from "@tanstack/react-router";
import { useHotkeys } from "react-hotkeys-hook";

import { useRecipeAssignment, useCompleteStep } from "@/hooks/useRecipeAssignments";
import { usePaintingModeState } from "@/hooks/usePaintingModeState";
import { useRecipeSections } from "@/hooks/useRecipeSections";
import { todayISO } from "@/lib/dates";

import { Skeleton } from "@/components/ui/skeleton";
import { PaintingModeView } from "@/features/painting-mode/PaintingModeView";

export function PaintingModePage() {
  const { assignmentId } = useParams({
    from: "/bare-layout/painting-mode/$assignmentId",
  });
  const assignmentIdNum = Number(assignmentId);

  if (Number.isNaN(assignmentIdNum)) return null;

  return <PaintingModePageInner assignmentId={assignmentIdNum} />;
}

// ---------------------------------------------------------------------------
// Inner component — hooks require a valid numeric assignmentId
// ---------------------------------------------------------------------------

function PaintingModePageInner({ assignmentId }: { assignmentId: number }) {
  const navigate = useNavigate();
  const { data: assignment, isLoading: assignmentLoading } =
    useRecipeAssignment(assignmentId);

  // Hooks must be called unconditionally — guard rendering below
  const recipeId = assignment?.recipe_id ?? 0;
  const unitId = assignment?.unit_id ?? 0;

  const state = usePaintingModeState(assignmentId, recipeId);
  const completeMutation = useCompleteStep();
  const { data: sections = [] } = useRecipeSections(recipeId);

  // Derive current step and section name for handleMarkDone
  const currentStep = state.orderedSteps.find(
    (s) => s.id === state.currentStepId,
  );
  const sectionName = currentStep?.section_id
    ? (sections.find((s) => s.id === currentStep.section_id)?.name ?? null)
    : null;

  // Mark done handler — single source of truth
  const handleMarkDone = () => {
    if (!currentStep || !assignment) return;
    completeMutation.mutate(
      {
        assignmentId,
        unitId,
        recipeStepId: currentStep.id,
        session: {
          unit_id: unitId,
          session_date: todayISO(),
          duration_minutes: 0,
          recipe_id: recipeId,
          recipe_step_id: currentStep.id,
          section_name: sectionName,
          recipe_section_id: currentStep.section_id ?? null,
        },
      },
      {
        onSuccess: () => state.goNext(),
      },
    );
  };

  // Exit handler (D-07) — safe navigation back
  const handleExit = () => {
    navigate({ to: "/" });
  };

  // Keyboard shortcuts enabled only when assignment loaded and state ready
  const enabled = !!assignment && !state.isLoading;

  useHotkeys(" ", handleMarkDone, { preventDefault: true, enabled });
  useHotkeys("arrowleft", () => state.goPrev(), { preventDefault: true, enabled });
  useHotkeys("arrowright", () => state.goNext(), { preventDefault: true, enabled });
  useHotkeys("escape", handleExit);

  // Loading state
  if (assignmentLoading) {
    return <Skeleton className="h-screen w-full" />;
  }

  // Assignment not found
  if (!assignment) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Assignment not found</h2>
          <p className="text-muted-foreground">
            The painting assignment could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <PaintingModeView
        state={state}
        onMarkDone={handleMarkDone}
        recipeId={assignment.recipe_id}
        isMutating={completeMutation.isPending}
      />
    </div>
  );
}
