import { Clock, Layers, LayoutList, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { PaintingRecipe } from "@/types/recipe";
import type { Faction } from "@/types/faction";
import type { AvailabilityStats } from "@/hooks/useRecipePaints";

const difficultyColors: Record<string, string> = {
  Beginner: "text-green-500",
  Intermediate: "text-yellow-500",
  Advanced: "text-orange-500",
  Expert: "text-red-500",
};

export interface RecipeCardProps {
  recipe: PaintingRecipe;
  faction: Faction | undefined;
  stepCount: number;
  sectionCount: number;
  swatches: { paint_id: number; hex_color: string | null }[];
  availability: AvailabilityStats | undefined;
  onClick: (recipe: PaintingRecipe) => void;
  onEdit: (recipe: PaintingRecipe) => void;
  onDelete: (recipe: PaintingRecipe) => void;
}

function AvailabilityBadge({ availability }: { availability: AvailabilityStats }) {
  const { owned, missing, runningLow } = availability;

  if (missing > 0 && runningLow > 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <span
          className="inline-block h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: "#22c55e" }}
        />
        {owned} owned
        <span className="mx-0.5">·</span>
        <span
          className="inline-block h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: "#f59e0b" }}
        />
        {runningLow} low
        <span className="mx-0.5">·</span>
        <span
          className="inline-block h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: "#ef4444" }}
        />
        {missing} missing
      </span>
    );
  }

  if (missing > 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <span
          className="inline-block h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: "#ef4444" }}
        />
        {missing} missing
        {owned > 0 && (
          <>
            <span className="mx-0.5">·</span>
            {owned} owned
          </>
        )}
      </span>
    );
  }

  if (runningLow > 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <span
          className="inline-block h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: "#f59e0b" }}
        />
        {runningLow} low
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <span
        className="inline-block h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: "#22c55e" }}
      />
      {owned} owned
    </span>
  );
}

export function RecipeCard({
  recipe,
  faction,
  stepCount,
  sectionCount,
  swatches,
  availability,
  onClick,
  onEdit,
  onDelete,
}: RecipeCardProps) {
  const total = swatches.length;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow gap-3"
      onClick={() => onClick(recipe)}
      aria-label={`View ${recipe.name}`}
    >
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold leading-tight">{recipe.name}</span>
          {faction && (
            <Badge
              style={{ backgroundColor: faction.color_theme }}
              className="border-transparent text-white shrink-0 text-[10px]"
              data-testid="faction-badge"
            >
              {faction.name}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 pt-0">
        {/* Swatch strip */}
        <div className="flex items-center">
          {total === 0 ? (
            <span className="text-xs text-muted-foreground">--</span>
          ) : (
            <>
              {swatches.slice(0, 8).map((s, i) => (
                <span
                  key={s.paint_id}
                  data-testid="swatch-dot"
                  className={`inline-block h-3 w-3 rounded-full border border-border shrink-0${i > 0 ? " -ml-1" : ""}${s.hex_color ? "" : " bg-muted"}`}
                  style={s.hex_color ? { backgroundColor: s.hex_color } : undefined}
                  aria-hidden="true"
                />
              ))}
              {total > 8 && (
                <span className="inline-flex items-center justify-center h-3 w-3 rounded-full bg-muted -ml-1 text-[8px] text-muted-foreground">
                  +{total - 8}
                </span>
              )}
            </>
          )}
        </div>

        {/* Badge row: surface + difficulty */}
        <div className="flex flex-wrap items-center gap-1">
          {recipe.surface && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {recipe.surface}
            </Badge>
          )}
          {recipe.difficulty && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 border-transparent ${difficultyColors[recipe.difficulty] ?? ""}`}
            >
              {recipe.difficulty}
            </Badge>
          )}
        </div>

        {/* Stats row: sections + steps + time */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {sectionCount > 1 && (
            <span className="flex items-center gap-1">
              <LayoutList className="h-3 w-3" />
              {sectionCount} sections
            </span>
          )}
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {stepCount} {stepCount === 1 ? "step" : "steps"}
          </span>
          {recipe.estimated_minutes !== null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {recipe.estimated_minutes} min
            </span>
          )}
        </div>

        {/* Availability badge */}
        {availability !== undefined && <AvailabilityBadge availability={availability} />}

        {/* Edit/Delete actions */}
        <div
          className="flex items-center gap-1 pt-1 border-t border-border/50"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(recipe)}
            aria-label={`Edit ${recipe.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDelete(recipe)}
            aria-label={`Delete ${recipe.name}`}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
