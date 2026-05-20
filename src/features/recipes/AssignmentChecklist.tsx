import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { useStepProgress, useToggleStepProgress } from "@/hooks/useRecipeAssignments";
import { computeAssignmentProgress } from "@/lib/computeAssignmentProgress";
import { useRecipePaints } from "@/hooks/useRecipePaints";
import { useRecipeSections } from "@/hooks/useRecipeSections";
import type { RecipeAssignment } from "@/types/recipeAssignment";
import type { RecipeStep } from "@/types/recipePaint";

interface AssignmentChecklistProps {
  assignment: RecipeAssignment; // never undefined -- parent gates mount
  recipeId: number;
}

export function AssignmentChecklist({ assignment, recipeId }: AssignmentChecklistProps) {
  const { data: steps = [] } = useRecipePaints(recipeId);
  const { data: sections = [] } = useRecipeSections(recipeId);
  const { data: stepProgressRows = [] } = useStepProgress(assignment.id);
  const toggleStep = useToggleStepProgress();

  // Derived: set of completed recipe_step_id values (no local state)
  const completedSet = useMemo(
    () => new Set(stepProgressRows.filter((p) => p.completed === 1).map((p) => p.recipe_step_id)),
    [stepProgressRows],
  );

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

  // Compute progress from step definitions and progress rows
  const progress = useMemo(
    () => computeAssignmentProgress(steps, stepProgressRows),
    [steps, stepProgressRows],
  );

  function handleToggle(recipeStepId: number, checked: boolean) {
    toggleStep.mutate({
      assignmentId: assignment.id,
      recipeStepId,
      completed: checked,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <Progress value={progress.percentage} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground tabular-nums">
          {progress.percentage}% complete
        </span>
      </div>

      {/* Sectioned accordion or flat list */}
      {sections.length > 0 ? (
        <Accordion type="multiple">
          {orphanSteps.length > 0 && (
            <AccordionItem value="general">
              <AccordionTrigger className="min-h-12">
                <span>General</span>
                <Badge variant="outline">
                  {orphanSteps.filter((s) => completedSet.has(s.id)).length}/{orphanSteps.length}
                </Badge>
              </AccordionTrigger>
              <AccordionContent>
                {orphanSteps.map((step) => (
                  <div key={step.id} className="min-h-12 flex items-center gap-2">
                    <Checkbox
                      checked={completedSet.has(step.id)}
                      onCheckedChange={(checked) => handleToggle(step.id, !!checked)}
                    />
                    <span className={completedSet.has(step.id) ? "line-through text-muted-foreground" : ""}>
                      {step.step_name}
                    </span>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}
          {sections.map((section) => {
            const bucket = progress.bySectionId.get(section.id) ?? { total: 0, completed: 0 };
            const sectionSteps = stepsBySection.get(section.id) ?? [];
            return (
              <AccordionItem key={section.id} value={String(section.id)}>
                <AccordionTrigger className="min-h-12">
                  <span>{section.name}</span>
                  <Badge variant="outline">
                    {bucket.completed}/{bucket.total}
                  </Badge>
                </AccordionTrigger>
                <AccordionContent>
                  {sectionSteps.map((step) => (
                    <div
                      key={step.id}
                      className="min-h-12 flex items-center gap-2"
                    >
                      <Checkbox
                        checked={completedSet.has(step.id)}
                        onCheckedChange={(checked) =>
                          handleToggle(step.id, !!checked)
                        }
                      />
                      <span
                        className={
                          completedSet.has(step.id)
                            ? "line-through text-muted-foreground"
                            : ""
                        }
                      >
                        {step.step_name}
                      </span>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <ul className="flex flex-col gap-2">
          {steps.map((step) => (
            <li
              key={step.id}
              className="min-h-12 flex items-center gap-2"
            >
              <Checkbox
                checked={completedSet.has(step.id)}
                onCheckedChange={(checked) =>
                  handleToggle(step.id, !!checked)
                }
              />
              <span
                className={
                  completedSet.has(step.id)
                    ? "line-through text-muted-foreground"
                    : ""
                }
              >
                {step.step_name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
