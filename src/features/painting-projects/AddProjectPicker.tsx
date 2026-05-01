import { useState } from "react";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

export function AddProjectPicker() {
  const [open, setOpen] = useState(false);
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
      <PopoverTrigger asChild>
        <Button variant="default" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add project
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
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
