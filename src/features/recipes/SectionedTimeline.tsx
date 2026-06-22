import { useMemo } from "react";
import type { RecipeSection } from "@/types/recipeSection";
import type { RecipeStep } from "@/types/recipePaint";
import type { Paint } from "@/types/paint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Layers } from "lucide-react";
import { RecipeStepTimeline } from "./RecipeStepTimeline";
import { TechniqueSectionBadge } from "./TechniqueSectionBadge";
import { isPaintMissing } from "@/lib/recipeSteps";
import { effectivePaintId, type SlotResolutionMap } from "@/lib/effectivePaintId";

/** Per-section technique metadata for the detail view (APPLY-05). */
export interface TechniqueSectionInfo {
  techniqueId: number;
  instanceId: number;
  techniqueName: string;
}

export interface SectionedTimelineProps {
  sections: RecipeSection[];
  steps: RecipeStep[];
  paintMap: Map<number, Paint>;
  stepPhotoUrls?: Map<number, string>;
  /**
   * Slot resolution map from useSlotResolutionMap(recipeId).
   * Passed by RecipeDetailSheet for technique-owned step swatch resolution.
   * Plain recipes (no techniques) omit this prop — effectivePaintId falls back
   * to step.paint_id for non-technique steps (FND-04 fallback).
   */
  slotMap?: SlotResolutionMap;
  /**
   * Map of section.id → TechniqueSectionInfo, populated only in the detail view
   * (RecipeDetailSheet). When present, technique sections render:
   *   - an interactive TechniqueSectionBadge (onNavigate → library tab)
   *   - an "Edit colours" button that calls onEditColours
   * Plain recipe editor passes nothing.
   */
  techniqueSectionInfoMap?: Map<number, TechniqueSectionInfo>;
  /** Called with section info when user clicks "Edit colours" on a technique section. */
  onEditColours?: (info: TechniqueSectionInfo) => void;
  /** Called when user clicks the technique badge; navigates to the library tab. */
  onNavigateToTechniques?: () => void;
}

export function SectionedTimeline({
  sections,
  steps,
  paintMap,
  stepPhotoUrls,
  slotMap,
  techniqueSectionInfoMap,
  onEditColours,
  onNavigateToTechniques,
}: SectionedTimelineProps) {
  // Resolved slot map — empty Map when not provided (plain recipe fallback).
  const resolvedSlotMap: SlotResolutionMap = slotMap ?? new Map();
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

  // Compute per-section availability (owned vs missing).
  // Technique-owned steps resolve via effectivePaintId so filled slots show the correct paint.
  const sectionAvailability = useMemo(() => {
    const map = new Map<number, { owned: number; missing: number }>();
    for (const step of steps) {
      if (step.section_id === null) continue;
      const resolvedId = effectivePaintId(step, resolvedSlotMap);
      if (resolvedId === null || resolvedId === 0) continue;
      const paint = paintMap.get(resolvedId);
      const current = map.get(step.section_id) ?? { owned: 0, missing: 0 };
      if (isPaintMissing(paint)) {
        current.missing += 1;
      } else {
        current.owned += 1;
      }
      map.set(step.section_id, current);
    }
    return map;
  }, [steps, paintMap, resolvedSlotMap]);

  // Guard AFTER hooks so hook order stays stable across empty<->non-empty transitions.
  if (sections.length === 0) return null;

  return (
    <div className="flex flex-col gap-6" data-testid="sectioned-timeline">
      {orphanSteps.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-muted-foreground">General</span>
          <RecipeStepTimeline steps={orphanSteps} paintMap={paintMap} stepPhotoUrls={stepPhotoUrls} slotMap={resolvedSlotMap} />
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

        const techniqueInfo = techniqueSectionInfoMap?.get(section.id);
        const isTechniqueSection = techniqueInfo !== undefined;

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

              {/* Technique badge (detail view only) — interactive link to library */}
              {isTechniqueSection && (
                <TechniqueSectionBadge
                  techniqueName={techniqueInfo.techniqueName}
                  onNavigate={onNavigateToTechniques}
                />
              )}

              {/* Right-side metadata */}
              <span className="text-xs text-muted-foreground ml-auto flex items-center gap-3">
                {/* "Edit colours" button for technique sections */}
                {isTechniqueSection && onEditColours && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-0.5 text-xs"
                    onClick={() => onEditColours(techniqueInfo)}
                  >
                    Edit colours
                  </Button>
                )}

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
                      className="inline-block h-2 w-2 rounded-full shrink-0 bg-green-500"
                    />
                    {availability.owned} owned
                    {availability.missing > 0 && (
                      <>
                        <span className="mx-0.5">·</span>
                        <span
                          className="inline-block h-2 w-2 rounded-full shrink-0 bg-red-500"
                        />
                        {availability.missing} missing
                      </>
                    )}
                  </span>
                )}
              </span>
            </div>

            {/* Steps grouped under this section — read-only for technique sections */}
            <div
              className={isTechniqueSection ? "pointer-events-none opacity-80" : undefined}
              title={isTechniqueSection ? "This step is part of a live-linked technique. Edit via 'Edit colours'." : undefined}
            >
              <RecipeStepTimeline
                steps={sectionSteps}
                paintMap={paintMap}
                stepPhotoUrls={stepPhotoUrls}
                slotMap={resolvedSlotMap}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
