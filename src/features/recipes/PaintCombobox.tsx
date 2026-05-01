import { useState } from "react";
import { ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { usePaints } from "@/hooks/usePaints";

export interface PaintComboboxProps {
  value: number | null;
  onChange: (paintId: number | null) => void;
  onCreateNew?: () => void;
}

export function PaintCombobox({ value, onChange, onCreateNew }: PaintComboboxProps) {
  const [open, setOpen] = useState(false);
  const { data: paints = [] } = usePaints();
  const selected = value !== null ? paints.find((p) => p.id === value) ?? null : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          {selected ? `${selected.brand} ${selected.name}` : "Search paints..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter>
          <CommandInput placeholder="Search paints..." />
          <CommandList>
            <CommandEmpty>No paints found. Add a new paint.</CommandEmpty>
            <CommandGroup>
              {paints.map((paint) => (
                <CommandItem
                  key={paint.id}
                  // shouldFilter operates on this string — concat brand + name (lowercase)
                  value={`${paint.brand} ${paint.name}`.toLowerCase()}
                  onSelect={() => {
                    onChange(paint.id);
                    setOpen(false);
                  }}
                >
                  <span
                    aria-hidden="true"
                    className={paint.owned === 1 ? "text-green-500" : "text-red-500"}
                  >
                    ●
                  </span>
                  <span className="ml-2">
                    {paint.brand} {paint.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {onCreateNew && (
              <CommandGroup>
                <CommandItem
                  value="__add-new-paint__"
                  onSelect={() => {
                    setOpen(false);
                    onCreateNew();
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add new paint
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
