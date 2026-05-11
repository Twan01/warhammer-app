import { useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";
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
import { useDetachmentsByFaction } from "@/hooks/useRulesExtended";

interface DetachmentPickerProps {
  factionWahapediaId: string | undefined;
  value: string | null;
  valueName: string | null;
  disabled: boolean;
  onChange: (detachmentId: string, detachmentName: string) => void;
  onClear: () => void;
}

export function DetachmentPicker({
  factionWahapediaId,
  value,
  valueName,
  disabled,
  onChange,
  onClear,
}: DetachmentPickerProps) {
  const [open, setOpen] = useState(false);
  const { data: detachments = [] } = useDetachmentsByFaction(
    disabled ? undefined : factionWahapediaId,
  );

  if (disabled) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        className="w-full justify-between font-normal text-muted-foreground"
      >
        Select a faction first
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex-1 justify-between font-normal",
              !value && "text-muted-foreground",
            )}
          >
            {value && valueName ? valueName : "Select detachment..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter>
            <CommandInput placeholder="Search detachments..." />
            <CommandList>
              <CommandEmpty>No detachments found.</CommandEmpty>
              <CommandGroup>
                {detachments.map((d) => (
                  <CommandItem
                    key={d.id}
                    value={d.name.toLowerCase()}
                    onSelect={() => {
                      onChange(d.id, d.name);
                      setOpen(false);
                    }}
                  >
                    {d.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear detachment"
          className="h-8 w-8 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
