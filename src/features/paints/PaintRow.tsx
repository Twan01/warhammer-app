import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableRow, TableCell } from "@/components/ui/table";
import type { PaintWithRecipeCount } from "@/types/paint";

interface PaintRowProps {
  paint: PaintWithRecipeCount;
  onEdit: (paint: PaintWithRecipeCount) => void;
  onDelete: (paint: PaintWithRecipeCount) => void;
  onToggleOwned: (paint: PaintWithRecipeCount) => void;
  onRecipeBadgeClick: (paint: PaintWithRecipeCount) => void;
}

export function PaintRow({
  paint,
  onEdit,
  onDelete,
  onToggleOwned,
  onRecipeBadgeClick,
}: PaintRowProps) {
  const isOwned = paint.owned === 1;
  const recipeCount = paint.recipe_count;

  return (
    <TableRow>
      {/* 1. Name (with swatch) */}
      <TableCell>
        <div className="flex items-center gap-2">
          {paint.hex_color ? (
            <span
              className="inline-block h-4 w-4 rounded-full border border-border shrink-0"
              style={{ backgroundColor: paint.hex_color }}
              aria-hidden="true"
            />
          ) : (
            <span className="inline-block h-4 w-4 rounded-full border border-border bg-muted shrink-0" aria-hidden="true" />
          )}
          <span className="font-normal">{paint.name}</span>
        </div>
      </TableCell>

      {/* 2. Brand */}
      <TableCell className="text-muted-foreground">{paint.brand}</TableCell>

      {/* 3. Type */}
      <TableCell className="text-muted-foreground">{paint.paint_type}</TableCell>

      {/* 4. Color Family */}
      <TableCell className="text-muted-foreground">{paint.color_family ?? "—"}</TableCell>

      {/* 5. Owned — clickable badge toggle (PINV-06) */}
      <TableCell>
        <Badge
          variant={isOwned ? "default" : "secondary"}
          role="button"
          tabIndex={0}
          onClick={() => onToggleOwned(paint)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggleOwned(paint);
            }
          }}
          className="cursor-pointer"
          aria-label={`Toggle owned status for ${paint.brand} ${paint.name}`}
        >
          {isOwned ? "Owned" : "Not owned"}
        </Badge>
      </TableCell>

      {/* 6. Recipes — count badge (PINV-05) */}
      <TableCell>
        {recipeCount > 0 ? (
          <Badge
            variant="secondary"
            className="cursor-pointer hover:bg-secondary/80"
            role="link"
            tabIndex={0}
            onClick={() => onRecipeBadgeClick(paint)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onRecipeBadgeClick(paint);
              }
            }}
            aria-label={`${paint.name} used in ${recipeCount} recipe${recipeCount === 1 ? "" : "s"} — click to filter recipes`}
          >
            Used in {recipeCount} recipe{recipeCount === 1 ? "" : "s"}
          </Badge>
        ) : (
          <Badge variant="outline">0 recipes</Badge>
        )}
      </TableCell>

      {/* 7. Actions */}
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(paint)}
            aria-label={`Edit ${paint.brand} ${paint.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(paint)}
            aria-label={`Delete ${paint.brand} ${paint.name}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
