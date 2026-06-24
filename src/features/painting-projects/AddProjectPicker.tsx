import { useState } from "react";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useUnits, useUpdateUnit, UNITS_KEY } from "@/hooks/useUnits";
import type { Unit } from "@/types/unit";

export function AddProjectPicker({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * When true, render no visible trigger button — only an invisible anchor.
   * Used by the global Quick Add instance (AppLayout), which is opened
   * programmatically via the sidebar "Create Project" item. Without this, the
   * trigger button renders as a dead, non-functional button at the bottom-left.
   */
  hideTrigger?: boolean;
} = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const { data: units = [] } = useUnits();
  const qc = useQueryClient();
  const updateUnit = useUpdateUnit();
  const inactive = units.filter((u) => u.is_active_project === 0);

  function activate(unit: Unit) {
    setOpen(false);
    const previous = qc.getQueryData<Unit[]>(UNITS_KEY);
    qc.setQueryData<Unit[]>(UNITS_KEY, (old) =>
      old?.map((u) => (u.id === unit.id ? { ...u, is_active_project: 1 as const } : u)) ?? [],
    );
    updateUnit.mutate(
      { id: unit.id, is_active_project: 1 },
      {
        onError: () => {
          qc.setQueryData(UNITS_KEY, previous);
          toast.error("Failed to update project status. Changes were not saved.");
        },
      },
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {hideTrigger ? (
        <PopoverAnchor className="pointer-events-none fixed left-1/2 top-4 -translate-x-1/2" />
      ) : (
        <PopoverTrigger asChild>
          <Button variant="default" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add project
          </Button>
        </PopoverTrigger>
      )}
      <PopoverContent className="w-72 p-0" align={hideTrigger ? "center" : "end"}>
        <Command shouldFilter>
          <CommandInput placeholder="Search units..." />
          <CommandList>
            <CommandEmpty>No inactive units found.</CommandEmpty>
            <CommandGroup>
              {inactive.map((u) => (
                <CommandItem key={u.id} value={u.name} onSelect={() => activate(u)}>
                  {u.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
