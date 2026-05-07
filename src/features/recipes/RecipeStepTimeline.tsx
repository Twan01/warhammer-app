import type { RecipeStep } from "@/types/recipePaint";
import type { Paint } from "@/types/paint";
import { Badge } from "@/components/ui/badge";
import { Clock, Paintbrush, Droplets } from "lucide-react";
import { isPaintMissing } from "./recipeSteps";

export interface RecipeStepTimelineProps {
  steps: RecipeStep[];
  paintMap: Map<number, Paint>;
  stepPhotoUrls?: Map<number, string>; // step.id -> asset:// URL
}

export function RecipeStepTimeline({ steps, paintMap, stepPhotoUrls }: RecipeStepTimelineProps) {
  if (steps.length === 0) {
    return <span className="text-sm text-muted-foreground">No steps added yet.</span>;
  }

  return (
    <div className="flex flex-col" data-testid="step-timeline">
      {steps.map((step, i) => {
        const paint = paintMap.get(step.paint_id);
        const missing = isPaintMissing(paint);
        const isLast = i === steps.length - 1;

        return (
          <div key={step.id} className="relative pl-8 pb-6 last:pb-0">
            {/* Connecting vertical line (except last step) */}
            {!isLast && (
              <div className="absolute left-[11px] top-5 bottom-0 w-px bg-border" />
            )}
            {/* Node dot — paint swatch color or muted */}
            <div
              className="absolute left-1 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background ring-2 ring-border"
              style={paint?.hex_color ? { backgroundColor: paint.hex_color } : undefined}
              data-testid="timeline-node"
            />
            {/* Step content */}
            <div className="flex flex-col gap-1">
              {/* Phase badge */}
              {step.painting_phase && (
                <Badge variant="outline" className="w-fit text-[10px] uppercase tracking-wider">
                  {step.painting_phase}
                </Badge>
              )}
              {/* Step title */}
              <p className="text-sm font-medium">{step.step_name}</p>
              {/* Paint name + owned/missing indicator */}
              {paint ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className={missing ? "text-red-500" : "text-green-500"}
                  >
                    ●
                  </span>
                  {paint.brand} {paint.name}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">(no paint linked)</span>
              )}
              {/* Tool / technique / dilution / time inline row */}
              {(step.tool || step.technique || step.dilution || step.time_estimate_minutes) && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {step.tool && (
                    <span className="inline-flex items-center gap-0.5">
                      <Paintbrush className="h-3 w-3" />
                      {step.tool}
                    </span>
                  )}
                  {step.technique && (
                    <span>{step.technique}</span>
                  )}
                  {step.dilution && (
                    <span className="inline-flex items-center gap-0.5">
                      <Droplets className="h-3 w-3" />
                      {step.dilution}
                    </span>
                  )}
                  {step.time_estimate_minutes != null && (
                    <span className="inline-flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {step.time_estimate_minutes} min
                    </span>
                  )}
                </div>
              )}
              {/* Step photo thumbnail */}
              {step.step_photo_path && stepPhotoUrls?.get(step.id) && (
                <img
                  src={stepPhotoUrls.get(step.id)}
                  alt={`Step: ${step.step_name} reference`}
                  className="mt-1 h-16 w-16 rounded object-cover"
                  data-testid="step-photo-thumbnail"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
