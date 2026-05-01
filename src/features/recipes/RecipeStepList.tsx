import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type DraftStep, makeDraftStep } from "./recipeSteps";
import { RecipeStepRow } from "./RecipeStepRow";

export interface RecipeStepListProps {
  steps: DraftStep[];
  onChange: (next: DraftStep[]) => void;
  onCreateNewPaint: (stepLocalId: string) => void;
}

export function RecipeStepList({ steps, onChange, onCreateNewPaint }: RecipeStepListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.localId === active.id);
    const newIndex = steps.findIndex((s) => s.localId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(steps, oldIndex, newIndex));
  }

  function updateAt(localId: string, next: DraftStep) {
    onChange(steps.map((s) => (s.localId === localId ? next : s)));
  }

  function removeAt(localId: string) {
    onChange(steps.filter((s) => s.localId !== localId));
  }

  function addStep() {
    onChange([...steps, makeDraftStep()]);
  }

  return (
    <div className="flex flex-col gap-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={steps.map((s) => s.localId)}
          strategy={verticalListSortingStrategy}
        >
          {steps.map((step) => (
            <RecipeStepRow
              key={step.localId}
              step={step}
              onChange={(next) => updateAt(step.localId, next)}
              onRemove={() => removeAt(step.localId)}
              onCreateNewPaint={() => onCreateNewPaint(step.localId)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button type="button" variant="outline" size="sm" onClick={addStep} className="self-start">
        <Plus className="mr-2 h-4 w-4" /> Add step
      </Button>
    </div>
  );
}
