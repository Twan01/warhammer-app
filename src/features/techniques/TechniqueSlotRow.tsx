import { GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { DraftTechniqueSlot } from "@/types/technique";

export interface TechniqueSlotRowProps {
  slot: DraftTechniqueSlot;
  onChange: (updated: DraftTechniqueSlot) => void;
  onRemove: () => void;
}

export function TechniqueSlotRow({ slot, onChange, onRemove }: TechniqueSlotRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.localId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 rounded-md border p-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab self-start text-muted-foreground"
        aria-label="Drag to reorder slot"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Input
            className="flex-1"
            placeholder="Slot name, e.g. Base Coat"
            maxLength={80}
            value={slot.name}
            onChange={(e) => onChange({ ...slot, name: e.target.value })}
          />
          <Input
            className="flex-1 text-xs"
            placeholder="Role hint, e.g. brightest core"
            maxLength={120}
            value={slot.role_hint ?? ""}
            onChange={(e) => onChange({ ...slot, role_hint: e.target.value || null })}
          />
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="self-start"
        onClick={onRemove}
        aria-label="Remove slot"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
