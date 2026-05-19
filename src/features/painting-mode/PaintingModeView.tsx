import { useState, useMemo, useEffect } from "react";
import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";

import { usePaints } from "@/hooks/usePaints";
import { useRecipeSections } from "@/hooks/useRecipeSections";
import { isPaintMissing } from "@/features/recipes/recipeSteps";

import { Skeleton } from "@/components/ui/skeleton";
import { SectionNavigator } from "./SectionNavigator";
import { StepFocalView } from "./StepFocalView";
import { PaintReadinessBanner } from "./PaintReadinessBanner";

import type { Paint } from "@/types/paint";
import type { usePaintingModeState } from "@/hooks/usePaintingModeState";

interface PaintingModeViewProps {
  state: ReturnType<typeof usePaintingModeState>;
  onMarkDone: () => void;
  onMarkDoneWithSession: () => void;
  recipeId: number;
  isMutating: boolean;
}

export function PaintingModeView({
  state,
  onMarkDone,
  onMarkDoneWithSession,
  recipeId,
  isMutating: _isMutating,
}: PaintingModeViewProps) {
  const { data: paints = [] } = usePaints();
  const { data: sections = [] } = useRecipeSections(recipeId);

  // Build paintMap: Map<number, Paint>
  const paintMap = useMemo(() => {
    const m = new Map<number, Paint>();
    for (const p of paints) m.set(p.id, p);
    return m;
  }, [paints]);

  // Derive missing paints for the banner
  const missingPaints = useMemo(() => {
    const seen = new Set<number>();
    const result: Array<{ id: number; name: string; brand: string }> = [];
    for (const step of state.orderedSteps) {
      if (step.paint_id == null) continue;
      const paint = paintMap.get(step.paint_id);
      if (!paint || !isPaintMissing(paint)) continue;
      if (seen.has(paint.id)) continue;
      seen.add(paint.id);
      result.push({ id: paint.id, name: paint.name, brand: paint.brand });
    }
    return result;
  }, [state.orderedSteps, paintMap]);

  // Resolve step photo URLs
  const [stepPhotoUrls, setStepPhotoUrls] = useState<Map<number, string>>(
    new Map(),
  );

  const stepsKey = useMemo(
    () =>
      state.orderedSteps
        .map((s) => `${s.id}:${s.step_photo_path ?? ""}`)
        .join(","),
    [state.orderedSteps],
  );

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      const stepsWithPhotos = state.orderedSteps.filter(
        (s) => s.step_photo_path,
      );
      if (stepsWithPhotos.length === 0) {
        setStepPhotoUrls((prev) => (prev.size === 0 ? prev : new Map()));
        return;
      }
      const appDir = await appDataDir();
      const entries: [number, string][] = [];
      for (const s of stepsWithPhotos) {
        const abs = await join(appDir, s.step_photo_path!);
        entries.push([s.id, convertFileSrc(abs)]);
      }
      if (!cancelled) setStepPhotoUrls(new Map(entries));
    }
    resolve();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepsKey]);

  // Derive current step, paint, and section name
  const currentStep = state.orderedSteps.find(
    (s) => s.id === state.currentStepId,
  );
  const currentPaint =
    currentStep?.paint_id != null
      ? paintMap.get(currentStep.paint_id)
      : undefined;
  const sectionName = currentStep?.section_id
    ? (sections.find((s) => s.id === currentStep.section_id)?.name ?? null)
    : null;

  // Banner dismiss state
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const showBanner = !bannerDismissed && missingPaints.length > 0;

  // Detect all-complete
  const isAllComplete =
    state.orderedSteps.length > 0 &&
    state.orderedSteps.every((s) => state.completedSet.has(s.id));

  // Loading state
  if (state.isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-[280px]" />
      </div>
    );
  }

  // Empty state
  if (state.orderedSteps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <h2 className="text-2xl font-semibold">No steps in this recipe</h2>
        <p className="text-base text-muted-foreground">
          This recipe has no steps to execute. Go back and add steps to the
          recipe first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {showBanner && (
        <PaintReadinessBanner
          missingPaints={missingPaints}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        <SectionNavigator
          sections={sections}
          orderedSteps={state.orderedSteps}
          completedSet={state.completedSet}
          currentStepId={state.currentStepId}
          sectionProgressMap={state.sectionProgressMap}
          goToStep={state.goToStep}
        />
        <StepFocalView
          currentStep={currentStep}
          paint={currentPaint}
          stepPhotoUrl={
            currentStep ? stepPhotoUrls.get(currentStep.id) : undefined
          }
          isCompleted={
            currentStep ? state.completedSet.has(currentStep.id) : false
          }
          onMarkDone={onMarkDone}
          onMarkDoneWithSession={onMarkDoneWithSession}
          goPrev={state.goPrev}
          goNext={state.goNext}
          canGoPrev={state.canGoPrev}
          canGoNext={state.canGoNext}
          currentIndex={state.currentIndex}
          totalSteps={state.orderedSteps.length}
          sectionName={sectionName}
          isAllComplete={isAllComplete}
        />
      </div>
    </div>
  );
}
