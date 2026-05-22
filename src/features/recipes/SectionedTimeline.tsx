import { useMemo } from "react";
import type { RecipeSection } from "@/types/recipeSection";
import type { RecipeStep } from "@/types/recipePaint";
import type { Paint } from "@/types/paint";
import { Badge } from "@/components/ui/badge";
import { Clock, Layers } from "lucide-react";
import { RecipeStepTimeline } from "./RecipeStepTimeline";
import { isPaintMissing } from "@/lib/recipeSteps";

export interface SectionedTimelineProps {
  sections: RecipeSection[];
  steps: RecipeStep[];
  paintMap: Map<number, Paint>;
  stepPhotoUrls?: Map<number, string>;
}

export function SectionedTimeline({
  sections,
  steps,
  paintMap,
  stepPhotoUrls,
}: SectionedTimelineProps) {
  if (sections.length === 0) return null;

  // Group steps by section_id; orphan steps (null section_id) collected separately
  const { stepsBySection, orphanSteps } = useMemo(() => {
    const map = new Map<number, RecipeStep[]>();
    const orphans: RecipeStep[] = [];
    for (const step of steps) {
      if (step.section_id === null) {
        orphans.push(step);
        continue;
      }
      const existing = map.get(step.section_id) ?? [];
      existing.push(step);
      map.set(step.section_id, existing);
    }
    return { stepsBySection: map, orphanSteps: orphans };
  }, [steps]);

  // Compute per-section availability (owned vs missing)
  const sectionAvailability = useMemo(() => {
    const map = new Map<number, { owned: number; missing: number }>();
    for (const step of steps) {
      if (step.section_id === null || step.paint_id === null || step.paint_id === 0) continue;
      const paint = paintMap.get(step.paint_id);
      const current = map.get(step.section_id) ?? { owned: 0, missing: 0 };
      if (isPaintMissing(paint)) {
        current.missing += 1;
      } else {
        current.owned += 1;
      }
      map.set(step.section_id, current);
    }
    return map;
  }, [steps, paintMap]);

  return (
    <div className="flex flex-col gap-6" data-testid="sectioned-timeline">
      {orphanSteps.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-muted-foreground">General</span>
          <RecipeStepTimeline steps={orphanSteps} paintMap={paintMap} stepPhotoUrls={stepPhotoUrls} />
        </div>
      )}
      {sections.map((section) => {
        const sectionSteps = stepsBySection.get(section.id) ?? [];
        const stepCount = sectionSteps.length;

        // Sum time estimates — null when all steps have null
        const totalMinutes = sectionSteps.every((s) => s.time_estimate_minutes === null)
          ? null
          : sectionSteps.reduce((sum, s) => sum + (s.time_estimate_minutes ?? 0), 0);

        const availability = sectionAvailability.get(section.id);

        const workflowParts = [section.technique, section.execution_mode, section.applies_to].filter(Boolean) as string[];

        return (
          <div key={section.id} className="flex flex-col gap-2">
            {/* Section header */}
            <div className="flex items-center gap-2 flex-wrap" data-testid="section-header">
              {section.section_type && (
                <Badge variant="outline" className="text-xs capitalize">
                  {section.section_type}
                </Badge>
              )}
              <span className="text-sm font-semibold">{section.name}</span>
              {section.surface && (
                <Badge variant="outline" className="text-xs">
                  {section.surface}
                </Badge>
              )}
              {section.optional === 1 && (
                <Badge variant="outline" className="text-xs">
                  Optional
                </Badge>
              )}
              {workflowParts.length > 0 && (
                <span className="text-xs text-muted-foreground capitalize">
                  {workflowParts.join(" · ")}
                </span>
              )}

              {/* Right-side metadata */}
              <span className="text-xs text-muted-foreground ml-auto flex items-center gap-3">
                {/* Step count */}
                <span className="flex items-center gap-0.5">
                  <Layers className="h-3 w-3" />
                  {stepCount} {stepCount === 1 ? "step" : "steps"}
                </span>

                {/* Estimated time */}
                {totalMinutes !== null && (
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {totalMinutes} min
                  </span>
                )}

                {/* Availability */}
                {availability && (availability.owned > 0 || availability.missing > 0) && (
                  <span className="flex items-center gap-1">
                    <span
                      className="inline-block h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: "#22c55e" }}
                    />
                    {availability.owned} owned
                    {availability.missing > 0 && (
                      <>
                        <span className="mx-0.5">·</span>
                        <span
                          className="inline-block h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: "#ef4444" }}
                        />
                        {availability.missing} missing
                      </>
                    )}
                  </span>
                )}
              </span>
            </div>

            {/* Steps grouped under this section */}
            <RecipeStepTimeline
              steps={sectionSteps}
              paintMap={paintMap}
              stepPhotoUrls={stepPhotoUrls}
            />
          </div>
        );
      })}
    </div>
  );
}
