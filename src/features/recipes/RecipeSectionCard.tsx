import { useState } from "react";
import { GripVertical, Trash2, ChevronDown } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RECIPE_SURFACES } from "./recipeSchema";
import { type DraftSection } from "./recipeSection";
import { RecipeStepList } from "./RecipeStepList";

interface RecipeSectionCardProps {
  section: DraftSection;
  onChange: (updated: DraftSection) => void;
  onRemove: () => void;
  onCreateNewPaint: (stepLocalId: string) => void;
}

export function RecipeSectionCard({
  section,
  onChange,
  onRemove,
  onCreateNewPaint,
}: RecipeSectionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.localId,
  });

  const [open, setOpen] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function handleDelete() {
    if (section.steps.length === 0) {
      onRemove();
    } else {
      setConfirmOpen(true);
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-card">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2 p-3">
          {/* Drag handle */}
          <button
            type="button"
            className="cursor-grab text-muted-foreground"
            {...attributes}
            {...listeners}
            aria-label="Drag section"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Section name input */}
          <Input
            className="h-7 flex-1 text-sm font-medium"
            value={section.name}
            onChange={(e) => onChange({ ...section, name: e.target.value })}
          />

          {/* Surface select */}
          <Select
            value={section.surface ?? "__none__"}
            onValueChange={(v) => onChange({ ...section, surface: v === "__none__" ? null : v })}
          >
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue placeholder="Surface" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">-- surface --</SelectItem>
              {RECIPE_SURFACES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Optional checkbox */}
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={section.optional === 1}
              onChange={(e) => onChange({ ...section, optional: e.target.checked ? 1 : 0 })}
            />
            Optional
          </label>

          {/* Step count badge — only when collapsed and steps exist */}
          {!open && section.steps.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {section.steps.length} step{section.steps.length !== 1 ? "s" : ""}
            </span>
          )}

          {/* Collapse trigger */}
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
              />
            </Button>
          </CollapsibleTrigger>

          {/* Delete button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3">
            <RecipeStepList
              steps={section.steps}
              onChange={(next) => onChange({ ...section, steps: next })}
              onCreateNewPaint={onCreateNewPaint}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Delete confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete section &quot;{section.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will also delete {section.steps.length} step
              {section.steps.length !== 1 ? "s" : ""} in this section. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onRemove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
