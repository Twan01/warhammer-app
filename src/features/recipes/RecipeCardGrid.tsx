import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaintingRecipe } from "@/types/recipe";
import type { Faction } from "@/types/faction";
import type { AvailabilityStats } from "@/hooks/useRecipePaints";
import { RecipeCard } from "./RecipeCard";
import { RecipeEmptyState } from "./RecipeEmptyState";

export interface RecipeCardGridProps {
  data: PaintingRecipe[];
  factions: Faction[];
  stepCountByRecipe: Map<number, number>;
  sectionCountByRecipe: Map<number, number>;
  swatchColorsByRecipe: Map<number, { paint_id: number; hex_color: string | null }[]>;
  availabilityByRecipe: Map<number, AvailabilityStats>;
  isLoading: boolean;
  onCardClick: (recipe: PaintingRecipe) => void;
  onAdd: () => void;
  onEdit: (recipe: PaintingRecipe) => void;
  onDelete: (recipe: PaintingRecipe) => void;
}

export function RecipeCardGrid({
  data,
  factions,
  stepCountByRecipe,
  sectionCountByRecipe,
  swatchColorsByRecipe,
  availabilityByRecipe,
  isLoading,
  onCardClick,
  onAdd,
  onEdit,
  onDelete,
}: RecipeCardGridProps) {
  const factionMap = useMemo(() => {
    const m = new Map<number, Faction>();
    for (const f of factions) m.set(f.id, f);
    return m;
  }, [factions]);

  if (isLoading) {
    return (
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`skeleton-card-${i}`}
            data-testid="recipe-card-skeleton"
            className="rounded-xl border bg-card p-6 flex flex-col gap-3"
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <RecipeEmptyState onAdd={onAdd} />;
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
    >
      {data.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          faction={recipe.faction_id !== null ? factionMap.get(recipe.faction_id) : undefined}
          stepCount={stepCountByRecipe.get(recipe.id) ?? 0}
          sectionCount={sectionCountByRecipe.get(recipe.id) ?? 0}
          swatches={swatchColorsByRecipe.get(recipe.id) ?? []}
          availability={availabilityByRecipe.get(recipe.id)}
          onClick={onCardClick}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
