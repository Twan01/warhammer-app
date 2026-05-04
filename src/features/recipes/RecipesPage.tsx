import { useEffect, useMemo, useState } from "react";
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
import { recipesRoute } from "@/app/router";
import { useRecipeIdsByPaint } from "@/hooks/useRecipePaints";
import { RecipeTable } from "./RecipeTable";
import { RecipeDetailSheet } from "./RecipeDetailSheet";
import { RecipeDeleteDialog } from "./RecipeDeleteDialog";
import { RecipeFormSheet } from "./RecipeFormSheet";
import { PageHeader } from "@/components/common/PageHeader";

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

  const { paintId } = recipesRoute.useSearch();
  const [paintFilter, setPaintFilter] = useState<number | null>(null);

  // PINV-05: seed paintFilter from URL on first mount only.
  // User can clear it like any other filter afterward — empty deps is intentional.
  useEffect(() => {
    if (paintId !== undefined) {
      setPaintFilter(paintId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: recipeIdsByPaint } = useRecipeIdsByPaint(paintFilter);

  // Sheet/dialog state
  const [selectedRecipe, setSelectedRecipe] = useState<PaintingRecipe | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleting, setDeleting] = useState<PaintingRecipe | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaintingRecipe | null>(null);

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
      if (paintFilter !== null) {
        // useRecipeIdsByPaint is disabled until data resolves; while loading, hide all recipes
        // (matches "no recipes use this paint" empty state until data arrives — single render flash).
        if (!recipeIdsByPaint || !recipeIdsByPaint.includes(r.id)) return false;
      }
      return true;
    });
  }, [recipes, factionFilter, unitFilter, areaFilter, paintFilter, recipeIdsByPaint]);

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

  const onAddRecipe = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const onEditRecipe = (recipe: PaintingRecipe) => {
    setEditing(recipe);
    setFormOpen(true);
    // Close detail sheet if open
    setDetailOpen(false);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Recipes"
        subtitle="Documented paint schemes for your models"
        actions={
          <Button onClick={onAddRecipe}>
            <Plus className="mr-2 h-4 w-4" /> Add Recipe
          </Button>
        }
      />

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
        {(factionFilter.length > 0 || unitFilter !== null || areaFilter.length > 0 || paintFilter !== null) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFactionFilter([]);
              setUnitFilter(null);
              setAreaFilter("");
              setPaintFilter(null);
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

      <RecipeFormSheet
        key={editing?.id ?? "new"}
        open={formOpen}
        recipe={editing}
        onClose={closeForm}
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
