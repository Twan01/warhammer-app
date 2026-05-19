import { ChevronLeft, ChevronRight, Check, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepMetadataRow } from "./StepMetadataRow";
import type { RecipeStep } from "@/types/recipePaint";
import type { Paint } from "@/types/paint";

export interface StepFocalViewProps {
  currentStep: RecipeStep | undefined;
  paint: Paint | undefined;
  stepPhotoUrl: string | undefined;
  isCompleted: boolean;
  onMarkDone: () => void;
  goPrev: () => void;
  goNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  currentIndex: number;
  totalSteps: number;
  sectionName: string | null;
  isAllComplete: boolean;
}

export function StepFocalView({
  currentStep,
  paint,
  stepPhotoUrl,
  isCompleted,
  onMarkDone,
  goPrev,
  goNext,
  canGoPrev,
  canGoNext,
  currentIndex,
  totalSteps,
  sectionName,
  isAllComplete,
}: StepFocalViewProps) {
  if (isAllComplete) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center gap-4">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <p className="text-2xl font-semibold">All steps complete!</p>
      </div>
    );
  }

  if (!currentStep) return null;

  const hasPaint = currentStep.paint_id !== null && paint;

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col">
      {/* 1. Step name */}
      <h2 className="text-2xl font-semibold" data-testid="step-name">
        {currentStep.step_name}
      </h2>

      {/* 2. Paint info block */}
      <div className="mt-4">
        {hasPaint ? (
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full border-2 border-background ring-2 ring-border shrink-0"
              style={{ backgroundColor: paint.hex_color ?? undefined }}
              data-testid="paint-swatch"
            />
            <div>
              <p className="text-xl font-semibold">{paint.name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {paint.brand} &middot; {paint.paint_type}
                </span>
                <span
                  className={
                    paint.owned === 1 ? "text-green-500" : "text-red-500"
                  }
                >
                  ●
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">(no paint)</p>
        )}
      </div>

      {/* 3. Metadata row */}
      <div className="mt-4">
        <StepMetadataRow
          technique={currentStep.technique}
          tool={currentStep.tool}
          dilution={currentStep.dilution}
          timeEstimateMinutes={currentStep.time_estimate_minutes}
          paintingPhase={currentStep.painting_phase}
        />
      </div>

      {/* 4. Reference photo */}
      {stepPhotoUrl && (
        <img
          src={stepPhotoUrl}
          alt={`Step: ${currentStep.step_name} reference`}
          className="max-w-full max-h-[320px] rounded-lg object-contain mt-4"
          data-testid="step-photo"
        />
      )}

      {/* 5. Step notes */}
      {currentStep.notes && (
        <p className="text-base text-muted-foreground mt-4">
          {currentStep.notes}
        </p>
      )}

      {/* 6. Navigation bar */}
      <div className="flex items-center justify-between mt-auto pt-6 border-t border-border">
        <Button
          variant="ghost"
          size="icon"
          disabled={!canGoPrev}
          aria-label="Previous step"
          onClick={goPrev}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <span className="text-sm" data-testid="position-indicator">
          Step {currentIndex + 1} of {totalSteps}
          {sectionName ? ` · ${sectionName}` : ""}
        </span>

        <Button
          variant="ghost"
          size="icon"
          disabled={!canGoNext}
          aria-label="Next step"
          onClick={goNext}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* 7. Mark Done button */}
      <Button
        className="w-full h-12 mt-4"
        disabled={isCompleted || isAllComplete}
        data-testid="mark-done-btn"
        onClick={onMarkDone}
      >
        <Check className="h-5 w-5 mr-2" />
        Mark Done
      </Button>
    </div>
  );
}
