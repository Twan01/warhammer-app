import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import { useRecipes } from "@/hooks/useRecipes";
import { useFactions } from "@/hooks/useFactions";
import { useUnits } from "@/hooks/useUnits";
import { getRecipePaintsByRecipe } from "@/db/queries/recipePaints";
import type { PaintingRecipe } from "@/types/recipe";
import { RecipeTable } from "./RecipeTable";
import { RecipeDetailSheet } from "./RecipeDetailSheet";
import { RecipeDeleteDialog } from "./RecipeDeleteDialog";

// Aggregate step counts in one query so the table can render "{N} steps" per row
function useAllStepCounts(recipes: PaintingRecipe[]) {
  return useQuery({
    queryKey: ["recipe-paints", "all-counts", recipes.map((r) => r.id).join(",")],
    queryFn: async () => {
      const result = new Map<number, number>();
      for (const r of recipes) {
        const steps = await getRecipePaintsByRecipe(r.id);
        result.set(r.id, steps.length);
      }
      return result;
    },
    enabled: recipes.length > 0,
  });
}

export function RecipesPage() {
  const { data: recipes = [], isLoading } = useRecipes();
  const { data: factions = [] } = useFactions();
  const { data: units = [] } = useUnits();
  const { data: stepCountByRecipe = new Map<number, number>() } = useAllStepCounts(recipes);

  // Filter state
  const [factionFilter, setFactionFilter] = useState<number[]>([]); // multi-select
  const [unitFilter, setUnitFilter] = useState<number | null>(null);
  const [areaFilter, setAreaFilter] = useState("");

  // Sheet/dialog state
  const [selectedRecipe, setSelectedRecipe] = useState<PaintingRecipe | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleting, setDeleting] = useState<PaintingRecipe | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      if (factionFilter.length > 0) {
        if (r.faction_id === null || !factionFilter.includes(r.faction_id)) return false;
      }
      if (unitFilter !== null) {
        if (r.unit_id !== unitFilter) return false;
      }
      const area = areaFilter.trim().toLowerCase();
      if (area.length > 0) {
        if (!r.area || !r.area.toLowerCase().includes(area)) return false;
      }
      return true;
    });
  }, [recipes, factionFilter, unitFilter, areaFilter]);

  const openDetail = (recipe: PaintingRecipe) => {
    setSelectedRecipe(recipe);
    setDetailOpen(true);
  };
  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedRecipe(null);
  };
  const openDelete = (recipe: PaintingRecipe) => {
    setDeleting(recipe);
    setDeleteOpen(true);
    // Close detail if open
    setDetailOpen(false);
  };
  const closeDelete = () => {
    setDeleteOpen(false);
    setDeleting(null);
  };

  // Plan 04-03 wires Add/Edit form Sheet to these handlers.
  // Until then, the Add/Edit buttons are no-ops with a console hint.
  const onAddRecipe = () => {
    console.warn("Recipe create form will be wired in plan 04-03.");
  };
  const onEditRecipe = (_recipe: PaintingRecipe) => {
    console.warn("Recipe edit form will be wired in plan 04-03.");
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Recipes</h1>
        <Button onClick={onAddRecipe}>
          <Plus className="mr-2 h-4 w-4" /> Add Recipe
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <FactionFilter
          factions={factions}
          value={factionFilter}
          onChange={setFactionFilter}
        />
        <UnitFilter units={units} value={unitFilter} onChange={setUnitFilter} />
        <Input
          placeholder="Filter by area..."
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          className="w-48"
        />
        {(factionFilter.length > 0 || unitFilter !== null || areaFilter.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFactionFilter([]);
              setUnitFilter(null);
              setAreaFilter("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <RecipeTable
        data={filtered}
        factions={factions}
        units={units}
        stepCountByRecipe={stepCountByRecipe}
        isLoading={isLoading}
        onRowClick={openDetail}
        onAdd={onAddRecipe}
        onEdit={onEditRecipe}
        onDelete={openDelete}
      />

      <RecipeDetailSheet
        open={detailOpen}
        recipe={selectedRecipe}
        onClose={closeDetail}
        onEdit={onEditRecipe}
        onDelete={openDelete}
      />

      <RecipeDeleteDialog
        key={deleting?.id ?? "none"}
        open={deleteOpen}
        recipe={deleting}
        onClose={closeDelete}
      />
    </div>
  );
}

function FactionFilter({
  factions,
  value,
  onChange,
}: {
  factions: { id: number; name: string }[];
  value: number[];
  onChange: (next: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const label =
    value.length === 0
      ? "Faction"
      : value.length === 1
      ? factions.find((f) => f.id === value[0])?.name ?? "Faction"
      : `Faction (${value.length})`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0">
        <Command>
          <CommandInput placeholder="Filter faction..." />
          <CommandList>
            <CommandEmpty>No faction found.</CommandEmpty>
            <CommandGroup>
              {factions.map((f) => {
                const checked = value.includes(f.id);
                return (
                  <CommandItem
                    key={f.id}
                    value={f.name}
                    onSelect={() => {
                      onChange(
                        checked ? value.filter((id) => id !== f.id) : [...value, f.id],
                      );
                    }}
                  >
                    <span className="mr-2 inline-block h-3 w-3 rounded-sm border border-input">
                      {checked ? "✓" : ""}
                    </span>
                    {f.name}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function UnitFilter({
  units,
  value,
  onChange,
}: {
  units: { id: number; name: string }[];
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = value !== null ? units.find((u) => u.id === value)?.name ?? "Unit" : "Unit";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0">
        <Command>
          <CommandInput placeholder="Filter unit..." />
          <CommandList>
            <CommandEmpty>No unit found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__any__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Any unit
              </CommandItem>
              {units.map((u) => (
                <CommandItem
                  key={u.id}
                  value={u.name}
                  onSelect={() => {
                    onChange(u.id);
                    setOpen(false);
                  }}
                >
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
