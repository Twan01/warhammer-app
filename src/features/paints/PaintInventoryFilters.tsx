import { useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandEmpty,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { PAINT_TYPES } from "@/types/paint";
import type { PaintType, PaintWithRecipeCount } from "@/types/paint";
import { usePaintInventoryFilters } from "./paintInventoryFilters";

interface PaintInventoryFiltersProps {
  paints: PaintWithRecipeCount[]; // unfiltered list — used to derive brand and color-family options
}

export function PaintInventoryFilters({ paints }: PaintInventoryFiltersProps) {
  const brands = usePaintInventoryFilters((s) => s.brands);
  const types = usePaintInventoryFilters((s) => s.types);
  const colorFamilies = usePaintInventoryFilters((s) => s.colorFamilies);
  const runningLow = usePaintInventoryFilters((s) => s.runningLow);
  const wishlist = usePaintInventoryFilters((s) => s.wishlist);
  const toggleBrand = usePaintInventoryFilters((s) => s.toggleBrand);
  const toggleType = usePaintInventoryFilters((s) => s.toggleType);
  const toggleColorFamily = usePaintInventoryFilters((s) => s.toggleColorFamily);
  const toggleRunningLow = usePaintInventoryFilters((s) => s.toggleRunningLow);
  const toggleWishlist = usePaintInventoryFilters((s) => s.toggleWishlist);
  const clearAll = usePaintInventoryFilters((s) => s.clearAll);

  // Brand options: derived from paints, sorted alphabetically
  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of paints) if (p.brand) set.add(p.brand);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [paints]);

  // Color Family options: derived from paints, sorted alphabetically, null excluded
  const colorFamilyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of paints) if (p.color_family) set.add(p.color_family);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [paints]);

  const hasAny =
    brands.length > 0 ||
    types.length > 0 ||
    colorFamilies.length > 0 ||
    runningLow ||
    wishlist;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <MultiSelectPopover
        label="Brand"
        count={brands.length}
        options={brandOptions.map((b) => ({ value: b, label: b }))}
        isSelected={(v) => brands.includes(v)}
        onToggle={(v) => toggleBrand(v)}
      />

      <MultiSelectPopover
        label="Type"
        count={types.length}
        options={PAINT_TYPES.map((t) => ({ value: t, label: t }))}
        isSelected={(v) => types.includes(v as PaintType)}
        onToggle={(v) => toggleType(v as PaintType)}
      />

      <MultiSelectPopover
        label="Color Family"
        count={colorFamilies.length}
        options={colorFamilyOptions.map((cf) => ({ value: cf, label: cf }))}
        isSelected={(v) => colorFamilies.includes(v)}
        onToggle={(v) => toggleColorFamily(v)}
      />

      <Button
        variant={runningLow ? "default" : "outline"}
        size="sm"
        onClick={toggleRunningLow}
        aria-pressed={runningLow}
      >
        Running Low
      </Button>

      <Button
        variant={wishlist ? "default" : "outline"}
        size="sm"
        onClick={toggleWishlist}
        aria-pressed={wishlist}
      >
        Wishlist
      </Button>

      {hasAny && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="ml-auto"
          aria-label="Clear all filters"
        >
          <X className="mr-1 h-3 w-3" />
          Clear filters
        </Button>
      )}
    </div>
  );
}

interface Option { value: string; label: string }
interface MultiSelectPopoverProps {
  label: string;
  count: number;
  options: Option[];
  isSelected: (v: string) => boolean;
  onToggle: (v: string) => void;
}

function MultiSelectPopover({ label, count, options, isSelected, onToggle }: MultiSelectPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Filter by ${label}`}>
          {label}
          {count > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
              {count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No options.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => onToggle(opt.value)}
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={isSelected(opt.value)}
                    className="mr-2 h-4 w-4 accent-primary"
                    aria-hidden="true"
                  />
                  <span>{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
