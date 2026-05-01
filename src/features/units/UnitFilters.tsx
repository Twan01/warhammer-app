import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandEmpty,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useFactions } from "@/hooks/useFactions";
import { PAINTING_STATUS_ORDER } from "@/types/unit";
import type { PaintingStatus, Unit } from "@/types/unit";
import { useCollectionFilters } from "./collectionFilters";

interface UnitFiltersProps {
  units: Unit[]; // page passes the unfiltered list so we can derive available categories
}

export function UnitFilters({ units }: UnitFiltersProps) {
  const search = useCollectionFilters((s) => s.search);
  const factionsSel = useCollectionFilters((s) => s.factions);
  const statusesSel = useCollectionFilters((s) => s.statuses);
  const categoriesSel = useCollectionFilters((s) => s.categories);
  const activeOnly = useCollectionFilters((s) => s.activeOnly);
  const setSearch = useCollectionFilters((s) => s.setSearch);
  const toggleFaction = useCollectionFilters((s) => s.toggleFaction);
  const toggleStatus = useCollectionFilters((s) => s.toggleStatus);
  const toggleCategory = useCollectionFilters((s) => s.toggleCategory);
  const toggleActiveOnly = useCollectionFilters((s) => s.toggleActiveOnly);
  const clearAll = useCollectionFilters((s) => s.clearAll);

  const { data: factions } = useFactions();

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const u of units) if (u.category) set.add(u.category);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [units]);

  const hasAny =
    search.length > 0 ||
    factionsSel.length > 0 ||
    statusesSel.length > 0 ||
    categoriesSel.length > 0 ||
    activeOnly;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative min-w-[200px]">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search units..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search units by name"
        />
      </div>

      <MultiSelectPopover
        label="Faction"
        count={factionsSel.length}
        options={(factions ?? []).map((f) => ({ value: String(f.id), label: f.name }))}
        isSelected={(v) => factionsSel.includes(Number(v))}
        onToggle={(v) => toggleFaction(Number(v))}
      />

      <MultiSelectPopover
        label="Status"
        count={statusesSel.length}
        options={PAINTING_STATUS_ORDER.map((s) => ({ value: s, label: s }))}
        isSelected={(v) => statusesSel.includes(v as PaintingStatus)}
        onToggle={(v) => toggleStatus(v as PaintingStatus)}
      />

      <MultiSelectPopover
        label="Category"
        count={categoriesSel.length}
        options={categoryOptions.map((c) => ({ value: c, label: c }))}
        isSelected={(v) => categoriesSel.includes(v)}
        onToggle={(v) => toggleCategory(v)}
      />

      <Button
        variant={activeOnly ? "default" : "outline"}
        size="sm"
        onClick={toggleActiveOnly}
        aria-pressed={activeOnly}
      >
        Active only
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
