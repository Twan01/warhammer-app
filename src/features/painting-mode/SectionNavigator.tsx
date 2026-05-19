import { useMemo } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import type { RecipeStep } from "@/types/recipePaint";
import type { RecipeSection } from "@/types/recipeSection";

const GENERAL_SECTION_ID = -1;

export interface SectionNavigatorProps {
  sections: RecipeSection[];
  orderedSteps: RecipeStep[];
  completedSet: Set<number>;
  currentStepId: number | null;
  sectionProgressMap: Map<
    number,
    { completed: number; total: number; name: string }
  >;
  goToStep: (id: number) => void;
}

export function SectionNavigator({
  sections,
  orderedSteps,
  completedSet,
  currentStepId,
  sectionProgressMap,
  goToStep,
}: SectionNavigatorProps) {
  // Group steps by section_id; null section_id -> GENERAL_SECTION_ID
  const stepsBySection = useMemo(() => {
    const map = new Map<number, RecipeStep[]>();
    for (const step of orderedSteps) {
      const key = step.section_id ?? GENERAL_SECTION_ID;
      const existing = map.get(key) ?? [];
      existing.push(step);
      map.set(key, existing);
    }
    return map;
  }, [orderedSteps]);

  // Build ordered section entries: real sections by order_index, then General last
  const sectionEntries = useMemo(() => {
    const sorted = [...sections].sort(
      (a, b) => a.order_index - b.order_index,
    );

    const entries: Array<{
      id: number;
      name: string;
      optional: boolean;
      steps: RecipeStep[];
    }> = sorted.map((s) => ({
      id: s.id,
      name: s.name,
      optional: s.optional === 1,
      steps: stepsBySection.get(s.id) ?? [],
    }));

    // Add virtual "General" section if unsectioned steps exist
    const generalSteps = stepsBySection.get(GENERAL_SECTION_ID);
    if (generalSteps && generalSteps.length > 0) {
      entries.push({
        id: GENERAL_SECTION_ID,
        name: "General",
        optional: false,
        steps: generalSteps,
      });
    }

    return entries;
  }, [sections, stepsBySection]);

  // Determine which section the current step belongs to
  const currentSectionId = useMemo(() => {
    if (currentStepId === null) return null;
    const step = orderedSteps.find((s) => s.id === currentStepId);
    if (!step) return null;
    return step.section_id ?? GENERAL_SECTION_ID;
  }, [currentStepId, orderedSteps]);

  return (
    <div className="w-[280px] border-r border-border bg-card overflow-y-auto p-4">
      <div className="flex flex-col gap-1">
        {sectionEntries.map((section) => {
          const isCurrentSection = section.id === currentSectionId;
          const progress = sectionProgressMap.get(section.id);
          const progressText = progress
            ? `${progress.completed}/${progress.total}`
            : `0/${section.steps.length}`;

          return (
            <Collapsible
              key={section.id}
              defaultOpen={isCurrentSection}
            >
              <div
                className={
                  isCurrentSection
                    ? "border-l-3 border-primary bg-accent/50 rounded"
                    : "rounded"
                }
                data-testid={
                  isCurrentSection ? "current-section" : undefined
                }
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-between w-full px-3 py-2 rounded hover:bg-accent/30"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{section.name}</span>
                      {section.optional && (
                        <Badge variant="outline" className="text-xs">
                          Optional
                        </Badge>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Badge variant="secondary">{progressText}</Badge>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-col gap-0.5 pb-1">
                    {section.steps.map((step) => {
                      const isCompleted = completedSet.has(step.id);
                      const isCurrent = step.id === currentStepId;

                      return (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => goToStep(step.id)}
                          className="pl-6 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-accent/30 rounded text-left w-full"
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4 text-green-500 shrink-0" />
                          ) : isCurrent ? (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          ) : (
                            <span className="h-2 w-2 rounded-full border border-muted-foreground shrink-0" />
                          )}
                          <span
                            className={
                              isCompleted
                                ? "text-sm text-muted-foreground line-through"
                                : isCurrent
                                  ? "text-sm font-semibold"
                                  : "text-sm"
                            }
                          >
                            {step.step_name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
