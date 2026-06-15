import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { StepMetadataRow } from "@/features/painting-mode/StepMetadataRow";
import type { RecipeStep } from "@/types/recipePaint";
import type { Paint } from "@/types/paint";

interface ChecklistStepRowProps {
  step: RecipeStep;
  completed: boolean;
  paint: Paint | undefined;
  altPaint: Paint | undefined;
  onToggle: (checked: boolean) => void;
}

/**
 * A single tick-off row in the applied-recipe checklist. Stays compact (just the
 * step name) until expanded, then reveals the full painting detail already stored
 * on the step — paint colour, technique, tool, dilution, time and notes — so the
 * user can paint straight from the checklist. Steps with no extra detail render
 * as a plain name row with no chevron.
 */
export function ChecklistStepRow({
  step,
  completed,
  paint,
  altPaint,
  onToggle,
}: ChecklistStepRowProps) {
  const [open, setOpen] = useState(false);

  const hasDetail =
    (step.paint_id !== null && !!paint) ||
    !!altPaint ||
    !!step.technique ||
    !!step.tool ||
    !!step.dilution ||
    step.time_estimate_minutes != null ||
    !!step.painting_phase ||
    !!step.notes;

  const nameClass = completed ? "line-through text-muted-foreground" : "";

  if (!hasDetail) {
    return (
      <div className="min-h-12 flex items-center gap-2">
        <Checkbox
          checked={completed}
          onCheckedChange={(checked) => onToggle(!!checked)}
        />
        <span className={`flex-1 ${nameClass}`}>{step.step_name}</span>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="min-h-12 flex items-center gap-2">
        <Checkbox
          checked={completed}
          onCheckedChange={(checked) => onToggle(!!checked)}
        />
        <CollapsibleTrigger className="flex flex-1 items-center gap-2 text-left">
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              open ? "rotate-90" : ""
            }`}
          />
          <span className={nameClass}>{step.step_name}</span>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="pl-8 pb-2 flex flex-col gap-2">
        {/* Primary paint */}
        {step.paint_id !== null && paint && (
          <div className="flex items-center gap-2 text-sm">
            <div
              className="h-5 w-5 rounded-full border border-border shrink-0"
              style={{ backgroundColor: paint.hex_color ?? undefined }}
            />
            <span>
              {paint.name}
              <span className="text-muted-foreground">
                {" "}
                &middot; {paint.brand} &middot; {paint.paint_type}
              </span>
            </span>
            <span
              className={paint.owned === 1 ? "text-green-500" : "text-red-500"}
              title={paint.owned === 1 ? "Owned" : "Missing"}
            >
              ●
            </span>
          </div>
        )}

        {/* Alternate paint */}
        {altPaint && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div
              className="h-4 w-4 rounded-full border border-border shrink-0"
              style={{ backgroundColor: altPaint.hex_color ?? undefined }}
            />
            <span>
              alt: {altPaint.name} &middot; {altPaint.brand}
            </span>
          </div>
        )}

        {/* Technique / tool / dilution / time / phase */}
        <StepMetadataRow
          technique={step.technique}
          tool={step.tool}
          dilution={step.dilution}
          timeEstimateMinutes={step.time_estimate_minutes}
          paintingPhase={step.painting_phase}
        />

        {/* Notes */}
        {step.notes && (
          <p className="text-sm text-muted-foreground">{step.notes}</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
