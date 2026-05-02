import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useUnits } from "@/hooks/useUnits";
import { useAddUnitToList } from "@/hooks/useArmyLists";

interface UnitPickerDialogProps {
  open: boolean;
  /** The list to add units to. Null when no list is selected (dialog should be closed in that case). */
  listId: number | null;
  /** Pre-filter by faction_id. Null means show ALL units (e.g. when the list has no faction). */
  factionId: number | null;
  onClose: () => void;
}

/**
 * ARMY-02 — Sibling-portal Dialog wrapping a Command palette to add units to a list.
 *
 * Architecture:
 *   - Rendered as a SIBLING to ArmyListDetailSheet at the ArmyListsPage root.
 *     NEVER nest inside another Radix portal (Pitfall 1).
 *   - Stays OPEN after each select for multi-add UX (CONTEXT.md decision).
 *   - When factionId is null, shows ALL units (Pitfall 3 — list with no faction).
 *
 * cmdk requirements: ResizeObserver + scrollIntoView polyfills (already wired in
 * tests/setup.ts — confirmed via 08-RESEARCH.md Pattern 6).
 */
export function UnitPickerDialog({
  open,
  listId,
  factionId,
  onClose,
}: UnitPickerDialogProps) {
  const { data: units = [] } = useUnits();
  const addUnitToList = useAddUnitToList();

  // Pitfall 3: null factionId means "no faction set on list" → show all units.
  const filteredUnits = factionId === null
    ? units
    : units.filter((u) => u.faction_id === factionId);

  function handleSelect(unitId: number) {
    if (listId === null) return;
    addUnitToList.mutate(
      { list_id: listId, unit_id: unitId },
      {
        onSuccess: () => {
          toast.success("Unit added.");
          // Do NOT close — stay open for multi-add (CONTEXT.md decision)
        },
        onError: () => toast.error("Failed to add unit. Please try again."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="p-0 sm:max-w-[480px]">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Add unit to list</DialogTitle>
          <DialogDescription>
            {factionId === null
              ? "Search any unit in your collection. Click to add — picker stays open for multiple adds."
              : "Search units in this list's faction. Click to add — picker stays open for multiple adds."}
          </DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search units..." />
          <CommandList>
            <CommandEmpty>No units found in this faction.</CommandEmpty>
            <CommandGroup>
              {filteredUnits.map((unit) => (
                <CommandItem
                  key={unit.id}
                  value={unit.name}
                  onSelect={() => handleSelect(unit.id)}
                >
                  <span className="flex-1">{unit.name}</span>
                  {unit.category && (
                    <Badge variant="secondary" className="ml-auto">
                      {unit.category}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
