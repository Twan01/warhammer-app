import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

const SUGGESTIONS = [
  "HQ/Leader",
  "Battleline",
  "Infantry",
  "Elite",
  "Vehicle",
  "Monster",
  "Transport",
  "Character",
  "Dedicated Transport",
  "Other",
];

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategoryCombobox({ value, onChange }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value);

  function commit(next: string) {
    onChange(next);
    setInput(next);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
        >
          {value || "Search or enter category..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter>
          <CommandInput
            placeholder="Search or enter category..."
            value={input}
            onValueChange={setInput}
            // Free-text: pressing Enter with no match commits the typed value
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim().length > 0) {
                e.preventDefault();
                commit(input.trim());
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              <button
                type="button"
                className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => commit(input.trim())}
                disabled={input.trim().length === 0}
              >
                Use &ldquo;{input || "..."}&rdquo; as category
              </button>
            </CommandEmpty>
            <CommandGroup heading="Suggestions">
              {SUGGESTIONS.map((s) => (
                <CommandItem key={s} value={s} onSelect={() => commit(s)}>
                  <Check className={cn("mr-2 h-4 w-4", value === s ? "opacity-100" : "opacity-0")} />
                  {s}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
