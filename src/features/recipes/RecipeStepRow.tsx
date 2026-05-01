import { GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { DraftStep } from "./recipeSteps";
import { PaintCombobox } from "./PaintCombobox";

const STEP_SUGGESTIONS = [
  "Primer",
  "Basecoat",
  "Shade",
  "Layer",
  "Highlight",
  "Glaze",
  "Weathering",
  "Technical",
  "Basing",
];

export interface RecipeStepRowProps {
  step: DraftStep;
  onChange: (next: DraftStep) => void;
  onRemove: () => void;
  onCreateNewPaint: () => void;
}

export function RecipeStepRow({
  step,
  onChange,
  onRemove,
  onCreateNewPaint,
}: RecipeStepRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.localId,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-2 rounded-md border p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab self-start text-muted-foreground"
        aria-label="Drag to reorder step"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Input
            className="w-40"
            placeholder="Primer, Basecoat, Shade…"
            list="recipe-step-suggestions"
            value={step.step_name}
            onChange={(e) => onChange({ ...step, step_name: e.target.value })}
          />
          <datalist id="recipe-step-suggestions">
            {STEP_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <div className="flex-1">
            <PaintCombobox
              value={step.paint_id}
              onChange={(paintId) => onChange({ ...step, paint_id: paintId })}
              onCreateNew={onCreateNewPaint}
            />
          </div>
        </div>
        <Input
          className="text-xs"
          placeholder="Notes, e.g. Basecoat black on the barrel…"
          value={step.notes ?? ""}
          onChange={(e) => onChange({ ...step, notes: e.target.value || null })}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="self-start"
        onClick={onRemove}
        aria-label="Remove step"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
