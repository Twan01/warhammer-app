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
import { useRecipes } from "@/hooks/useRecipes";
import { useFactions } from "@/hooks/useFactions";
import { useUnits } from "@/hooks/useUnits";
import type { PaintingRecipe } from "@/types/recipe";
import { recipesRoute } from "@/app/router";
import {
  useRecipeIdsByPaint,
  useRecipeSwatchData,
  useAllStepCounts,
  useRecipePaintAvailability,
  type AvailabilityStats,
} from "@/hooks/useRecipePaints";
import { RECIPE_SURFACES, RECIPE_STYLES, RECIPE_DIFFICULTIES } from "./recipeSchema";
import { RecipeCardGrid } from "./RecipeCardGrid";
import { RecipeDetailSheet } from "./RecipeDetailSheet";
import { RecipeDeleteDialog } from "./RecipeDeleteDialog";
import { RecipeFormSheet } from "./RecipeFormSheet";
import { PageHeader } from "@/components/common/PageHeader";
import { applyRecipeFilters } from "./applyRecipeFilters";

export function RecipesPage() {
  const { data: recipes = [], isLoading } = useRecipes();
  const { data: factions = [] } = useFactions();
  const { data: units = [] } = useUnits();
  const { data: stepCountByRecipe = new Map<number, number>() } = useAllStepCounts();
  const { data: swatchColorsByRecipe = new Map<number, { paint_id: number; hex_color: string | null }[]>() } = useRecipeSwatchData();
  const { data: availabilityByRecipe = new Map<number, AvailabilityStats>() } = useRecipePaintAvailability();

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

  // New studio filters
  const [surfaceFilter, setSurfaceFilter] = useState<string | null>(null);
  const [styleFilter, setStyleFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [hasMissingFilter, setHasMissingFilter] = useState(false);

  // Sheet/dialog state
  const [selectedRecipe, setSelectedRecipe] = useState<PaintingRecipe | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleting, setDeleting] = useState<PaintingRecipe | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaintingRecipe | null>(null);

  const filtered = useMemo(() => {
    return applyRecipeFilters(recipes, {
      factionFilter,
      unitFilter,
      areaFilter,
      paintFilter,
      recipeIdsByPaint,
      surfaceFilter,
      styleFilter,
      difficultyFilter,
      hasMissingFilter,
      availabilityByRecipe,
    });
  }, [
    recipes,
    factionFilter,
    unitFilter,
    areaFilter,
    paintFilter,
    recipeIdsByPaint,
    surfaceFilter,
    styleFilter,
    difficultyFilter,
    hasMissingFilter,
    availabilityByRecipe,
  ]);

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

  const hasActiveFilters =
    factionFilter.length > 0 ||
    unitFilter !== null ||
    areaFilter.length > 0 ||
    paintFilter !== null ||
    surfaceFilter !== null ||
    styleFilter !== null ||
    difficultyFilter !== null ||
    hasMissingFilter;

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
        <StringFilter
          label={surfaceFilter ?? "Surface"}
          placeholder="Filter surface..."
          items={RECIPE_SURFACES as unknown as string[]}
          value={surfaceFilter}
          onChange={setSurfaceFilter}
        />
        <StringFilter
          label={styleFilter ?? "Style"}
          placeholder="Filter style..."
          items={RECIPE_STYLES as unknown as string[]}
          value={styleFilter}
          onChange={setStyleFilter}
        />
        <StringFilter
          label={difficultyFilter ?? "Difficulty"}
          placeholder="Filter difficulty..."
          items={RECIPE_DIFFICULTIES as unknown as string[]}
          value={difficultyFilter}
          onChange={setDifficultyFilter}
        />
        <Button
          variant={hasMissingFilter ? "default" : "outline"}
          size="sm"
          onClick={() => setHasMissingFilter((v) => !v)}
        >
          Missing paints
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFactionFilter([]);
              setUnitFilter(null);
              setAreaFilter("");
              setPaintFilter(null);
              setSurfaceFilter(null);
              setStyleFilter(null);
              setDifficultyFilter(null);
              setHasMissingFilter(false);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <RecipeCardGrid
        data={filtered}
        factions={factions}
        units={units}
        stepCountByRecipe={stepCountByRecipe}
        swatchColorsByRecipe={swatchColorsByRecipe}
        availabilityByRecipe={availabilityByRecipe}
        isLoading={isLoading}
        onCardClick={openDetail}
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

function StringFilter({
  label,
  placeholder,
  items,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: string[];
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={value !== null ? "default" : "outline"} size="sm">
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__any__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Any
              </CommandItem>
              {items.map((item) => (
                <CommandItem
                  key={item}
                  value={item}
                  onSelect={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  {item}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
