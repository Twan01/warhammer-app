import { useState } from "react";
import { Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Unit, PaintingStatus } from "@/types/unit";
import { PAINTING_STATUS_ORDER } from "@/types/unit";
import { useUpdateUnit, UNITS_KEY } from "@/hooks/useUnits";

interface StatusPopoverProps {
  unit: Unit;
}

export function StatusPopover({ unit }: StatusPopoverProps) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const updateUnit = useUpdateUnit();

  function handleSelect(newStatus: PaintingStatus) {
    setOpen(false);
    if (newStatus === unit.status_painting) return;

    // 1. Snapshot previous list for rollback
    const previous = qc.getQueryData<Unit[]>(UNITS_KEY);
    // 2. Optimistically patch the cache
    qc.setQueryData<Unit[]>(UNITS_KEY, (old) =>
      old?.map((u) =>
        u.id === unit.id ? { ...u, status_painting: newStatus } : u
      ) ?? []
    );
    // 3. Fire the mutation; rollback on error
    updateUnit.mutate(
      { id: unit.id, status_painting: newStatus },
      {
        onError: () => {
          qc.setQueryData(UNITS_KEY, previous);
          toast.error("Status update failed. The change has been reverted.");
        },
      }
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Change status for ${unit.name}, currently ${unit.status_painting}`}
          className="cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <StatusBadge status={unit.status_painting} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-0"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandList>
            <CommandGroup>
              {PAINTING_STATUS_ORDER.map((status) => (
                <CommandItem
                  key={status}
                  value={status}
                  onSelect={() => handleSelect(status)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      unit.status_painting === status ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {status}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
