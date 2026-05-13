import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useBulkCreateAssignments,
  useAssignmentsByRecipe,
} from "@/hooks/useRecipeAssignments";
import { useUnits } from "@/hooks/useUnits";
import { useFactions } from "@/hooks/useFactions";
import type { PaintingRecipe } from "@/types/recipe";

interface ApplyToUnitsDialogProps {
  open: boolean;
  recipe: PaintingRecipe;
  onClose: () => void;
}

/**
 * AR-07 -- Multi-select unit picker for bulk recipe application.
 *
 * Architecture:
 *   - Rendered as a SIBLING to Sheet (NOT inside SheetContent -- P6 pitfall).
 *   - Already-assigned units are dimmed and disabled (UNIQUE constraint).
 *   - Confirm button shows dynamic count of selected units.
 */
export function ApplyToUnitsDialog({
  open,
  recipe,
  onClose,
}: ApplyToUnitsDialogProps) {
  const { data: units = [] } = useUnits();
  const { data: factions = [] } = useFactions();
  const { data: existingAssignments = [] } = useAssignmentsByRecipe(recipe.id);
  const bulkCreate = useBulkCreateAssignments();

  const factionMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const f of factions) m.set(f.id, f.name);
    return m;
  }, [factions]);

  const assignedUnitIds = useMemo(
    () => new Set(existingAssignments.map((a) => a.unit_id)),
    [existingAssignments],
  );

  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<number>>(
    new Set(),
  );

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedUnitIds(new Set());
    }
  }, [open]);

  function toggleUnit(id: number) {
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    bulkCreate.mutate(
      { unitIds: Array.from(selectedUnitIds), recipeId: recipe.id },
      {
        onSuccess: () => {
          toast.success(
            `Recipe applied to ${selectedUnitIds.size} unit${selectedUnitIds.size !== 1 ? "s" : ""}.`,
          );
          onClose();
        },
        onError: () => toast.error("Failed to apply recipe. Please try again."),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Apply "{recipe.name}" to units</DialogTitle>
          <DialogDescription>
            Select one or more units to apply this recipe to. Already-assigned
            units are dimmed.
          </DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search units..." />
          <CommandList>
            <CommandEmpty>No units found.</CommandEmpty>
            <CommandGroup>
              {units.map((unit) => {
                const isAssigned = assignedUnitIds.has(unit.id);
                const isSelected = selectedUnitIds.has(unit.id);
                return (
                  <CommandItem
                    key={unit.id}
                    value={unit.name}
                    disabled={isAssigned}
                    onSelect={() => {
                      if (!isAssigned) toggleUnit(unit.id);
                    }}
                    className={isAssigned ? "opacity-50" : ""}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="mr-2"
                      tabIndex={-1}
                    />
                    <span className="flex-1">{unit.name}</span>
                    {unit.faction_id != null && factionMap.has(unit.faction_id) && (
                      <Badge variant="secondary" className="ml-auto">
                        {factionMap.get(unit.faction_id)}
                      </Badge>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={bulkCreate.isPending || selectedUnitIds.size === 0}
          >
            Apply to {selectedUnitIds.size} unit
            {selectedUnitIds.size !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
