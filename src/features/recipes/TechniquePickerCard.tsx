import { Layers, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TechniqueWithCounts } from "@/types/technique";

export interface TechniquePickerCardProps {
  technique: TechniqueWithCounts;
  isSelected: boolean;
  onSelect: (technique: TechniqueWithCounts) => void;
}

/**
 * Condensed technique card for the technique picker dialog.
 * Shows name + slot_count + step_count. bg-accent when selected.
 */
export function TechniquePickerCard({
  technique,
  isSelected,
  onSelect,
}: TechniquePickerCardProps) {
  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-md border p-2 text-left transition-colors cursor-pointer",
        isSelected
          ? "bg-accent border-accent-foreground/20"
          : "hover:bg-accent/50 border-border",
      )}
      onClick={() => onSelect(technique)}
      aria-pressed={isSelected}
    >
      <span className="block text-sm font-medium leading-tight">{technique.name}</span>
      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Layers className="h-3 w-3" aria-hidden="true" />
          {technique.slot_count} {technique.slot_count === 1 ? "slot" : "slots"}
        </span>
        <span className="flex items-center gap-1">
          <ListChecks className="h-3 w-3" aria-hidden="true" />
          {technique.step_count} {technique.step_count === 1 ? "step" : "steps"}
        </span>
      </div>
    </button>
  );
}
