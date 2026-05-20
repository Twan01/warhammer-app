import { useState, useMemo, useRef, useEffect } from "react";
import { useRecipePaints } from "@/hooks/useRecipePaints";
import { useRecipeSections } from "@/hooks/useRecipeSections";
import { useStepProgress } from "@/hooks/useRecipeAssignments";

/**
 * Painting Mode navigation state hook (D-07, D-08).
 *
 * Composes three existing React Query hooks to derive:
 * - Section-aware step ordering (COALESCE(section.order_index, 999999))
 * - First-incomplete-step selection for initial position
 * - Prev / next / jumpTo navigation within ordered steps
 * - Per-section progress summary (completed / total / name)
 *
 * Pure composition layer — no new DB queries.
 */
export function usePaintingModeState(assignmentId: number, recipeId: number) {
  const stepsQuery = useRecipePaints(recipeId);
  const sectionsQuery = useRecipeSections(recipeId);
  const progressQuery = useStepProgress(assignmentId);

  const steps = stepsQuery.data ?? [];
  const sections = sectionsQuery.data ?? [];
  const progressRows = progressQuery.data ?? [];

  const isLoading =
    stepsQuery.isLoading || sectionsQuery.isLoading || progressQuery.isLoading;

  // Map section id -> order_index for O(1) lookup during sort
  const sectionOrderMap = useMemo(
    () => new Map(sections.map((s) => [s.id, s.order_index])),
    [sections],
  );

  // D-03, D-04: Sort by section order_index (null sections last via 999999), then step order_index
  const orderedSteps = useMemo(
    () =>
      [...steps].sort((a, b) => {
        const aSection =
          a.section_id !== null
            ? (sectionOrderMap.get(a.section_id) ?? 999999)
            : 999999;
        const bSection =
          b.section_id !== null
            ? (sectionOrderMap.get(b.section_id) ?? 999999)
            : 999999;
        if (aSection !== bSection) return aSection - bSection;
        return a.order_index - b.order_index;
      }),
    [steps, sectionOrderMap],
  );

  // Integer comparison (=== 1), not truthy, per SQLite boolean convention
  const completedSet = useMemo(
    () =>
      new Set(
        progressRows
          .filter((p) => p.completed === 1)
          .map((p) => p.recipe_step_id),
      ),
    [progressRows],
  );

  const firstIncompleteId = useMemo(
    () =>
      orderedSteps.find((s) => !completedSet.has(s.id))?.id ??
      orderedSteps[orderedSteps.length - 1]?.id ??
      null,
    [orderedSteps, completedSet],
  );

  const [currentStepId, setCurrentStepId] = useState<number | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current && firstIncompleteId !== null) {
      setCurrentStepId(firstIncompleteId);
      hasInitialized.current = true;
    }
  }, [firstIncompleteId]);

  const currentIndex = orderedSteps.findIndex((s) => s.id === currentStepId);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < orderedSteps.length - 1;

  const goPrev = () => {
    if (currentIndex > 0) setCurrentStepId(orderedSteps[currentIndex - 1].id);
  };

  const goNext = () => {
    if (currentIndex < orderedSteps.length - 1)
      setCurrentStepId(orderedSteps[currentIndex + 1].id);
  };

  const goToStep = (id: number) => setCurrentStepId(id);

  // Per-section progress: completed / total / name
  const sectionProgressMap = useMemo(() => {
    const map = new Map<
      number,
      { completed: number; total: number; name: string }
    >();
    for (const step of orderedSteps) {
      if (step.section_id === null) continue;
      const entry = map.get(step.section_id) ?? {
        completed: 0,
        total: 0,
        name: "",
      };
      entry.total++;
      if (completedSet.has(step.id)) entry.completed++;
      const section = sections.find((s) => s.id === step.section_id);
      if (section) entry.name = section.name;
      map.set(step.section_id, entry);
    }
    return map;
  }, [orderedSteps, completedSet, sections]);

  return {
    orderedSteps,
    currentStepId,
    currentIndex,
    completedSet,
    isLoading,
    canGoPrev,
    canGoNext,
    goPrev,
    goNext,
    goToStep,
    sectionProgressMap,
  };
}
