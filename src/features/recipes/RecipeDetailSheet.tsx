import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRecipePaints } from "@/hooks/useRecipePaints";
import { usePaints } from "@/hooks/usePaints";
import { useFactions } from "@/hooks/useFactions";
import { useUnits } from "@/hooks/useUnits";
import type { PaintingRecipe } from "@/types/recipe";
import { isPaintMissing } from "./recipeSteps";

export interface RecipeDetailSheetProps {
  open: boolean;
  recipe: PaintingRecipe | null;
  onClose: () => void;
  onEdit: (recipe: PaintingRecipe) => void;
  onDelete: (recipe: PaintingRecipe) => void;
}

export function RecipeDetailSheet({
  open,
  recipe,
  onClose,
  onEdit,
  onDelete,
}: RecipeDetailSheetProps) {
  const { data: factions } = useFactions();
  const { data: units } = useUnits();
  const { data: paints = [] } = usePaints();
  const { data: steps = [] } = useRecipePaints(recipe?.id);

  const faction = useMemo(
    () =>
      recipe?.faction_id !== undefined && recipe?.faction_id !== null
        ? (factions ?? []).find((f) => f.id === recipe.faction_id) ?? null
        : null,
    [factions, recipe],
  );
  const unit = useMemo(
    () =>
      recipe?.unit_id !== undefined && recipe?.unit_id !== null
        ? (units ?? []).find((u) => u.id === recipe.unit_id) ?? null
        : null,
    [units, recipe],
  );
  const paintMap = useMemo(() => {
    const m = new Map<number, typeof paints[number]>();
    for (const p of paints) m.set(p.id, p);
    return m;
  }, [paints]);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        key={recipe?.id ?? "none"}
        className="overflow-y-auto sm:max-w-md"
      >
        {recipe && (
          <>
            <SheetHeader>
              <SheetTitle>{recipe.name}</SheetTitle>
              <SheetDescription>
                {faction ? (
                  <Badge
                    style={{ backgroundColor: faction.color_theme }}
                    className="border-transparent text-white"
                  >
                    {faction.name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">No faction linked</span>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 p-4">
              <Field label="Linked Unit">
                <span className="text-sm">{unit?.name ?? "—"}</span>
              </Field>
              <Field label="Area">
                <span className="text-sm">{recipe.area ?? "—"}</span>
              </Field>
              {recipe.tutorial_link && (
                <Field label="Tutorial">
                  <a
                    href={recipe.tutorial_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline"
                  >
                    {recipe.tutorial_link}
                  </a>
                </Field>
              )}
              {recipe.notes && (
                <Field label="Notes">
                  <p className="whitespace-pre-wrap text-sm">{recipe.notes}</p>
                </Field>
              )}

              <Separator />

              <Field label="Recipe Steps">
                {steps.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No steps added yet.</span>
                ) : (
                  <ol className="flex flex-col gap-2">
                    {steps.map((s, i) => {
                      const paint = paintMap.get(s.paint_id);
                      const missing = isPaintMissing(paint);
                      return (
                        <li key={s.id} className="flex items-center gap-2 text-sm">
                          <span className="text-xs text-muted-foreground">{i + 1}.</span>
                          <span className="font-medium">{s.step_name}</span>
                          {paint ? (
                            <span className="inline-flex items-center gap-1">
                              <span
                                aria-hidden="true"
                                className={missing ? "text-red-500" : "text-green-500"}
                              >
                                ●
                              </span>
                              <span>
                                {paint.brand} {paint.name}
                              </span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              (no paint linked)
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </Field>
            </div>

            <SheetFooter className="mt-6 gap-2 sm:gap-2">
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(recipe)}
              >
                Delete Recipe
              </Button>
              <Button onClick={() => onEdit(recipe)}>Edit Recipe</Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}
