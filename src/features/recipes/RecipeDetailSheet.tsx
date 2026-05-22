import { useEffect, useMemo, useState } from "react";
import { ApplyToUnitsDialog } from "./ApplyToUnitsDialog";
import { useNavigate } from "@tanstack/react-router";
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
import { Clock, Copy, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useRecipePaints } from "@/hooks/useRecipePaints";
import { usePaints } from "@/hooks/usePaints";
import { useFactions } from "@/hooks/useFactions";
import { useUnits } from "@/hooks/useUnits";
import { useDuplicateRecipe } from "@/hooks/useRecipes";
import { useWishlistItems, useCreateWishlistItem } from "@/hooks/useWishlistItems";
import { useSessionsByRecipe } from "@/hooks/useJournalSessions";
import { useAssignmentsByRecipe } from "@/hooks/useRecipeAssignments";
import { useRecipeSections } from "@/hooks/useRecipeSections";
import type { PaintingRecipe } from "@/types/recipe";
import { RecipeStepTimeline } from "./RecipeStepTimeline";
import { SectionedTimeline } from "./SectionedTimeline";
import { isPaintMissing } from "@/lib/recipeSteps";
import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";

const difficultyColors: Record<string, string> = {
  Beginner: "text-green-500",
  Intermediate: "text-yellow-500",
  Advanced: "text-orange-500",
  Expert: "text-red-500",
};

export interface RecipeDetailSheetProps {
  open: boolean;
  recipe: PaintingRecipe | null;
  onClose: () => void;
  onEdit: (recipe: PaintingRecipe) => void;
  onDelete: (recipe: PaintingRecipe) => void;
  onDuplicate: (newRecipeId: number) => void;
}

export function RecipeDetailSheet({
  open,
  recipe,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
}: RecipeDetailSheetProps) {
  const { data: factions } = useFactions();
  const { data: units } = useUnits();
  const { data: paints = [] } = usePaints();
  const { data: steps = [] } = useRecipePaints(recipe?.id);
  const { data: sections = [], isLoading: sectionsLoading } = useRecipeSections(recipe?.id);

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

  const { data: sessions = [] } = useSessionsByRecipe(recipe?.id);
  const { data: assignments = [] } = useAssignmentsByRecipe(recipe?.id);

  const unitMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of units ?? []) m.set(u.id, u.name);
    return m;
  }, [units]);

  const duplicateRecipe = useDuplicateRecipe();
  const { data: wishlistItems = [] } = useWishlistItems();
  const createWishlistItem = useCreateWishlistItem();

  const missingPaints = useMemo(() => {
    return steps
      .filter((s): s is typeof s & { paint_id: number } => s.paint_id != null && s.paint_id !== 0)
      .map((s) => paintMap.get(s.paint_id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined && isPaintMissing(p));
  }, [steps, paintMap]);

  const uniqueMissingPaints = useMemo(() => {
    const seen = new Set<number>();
    return missingPaints.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [missingPaints]);

  const canAddToWishlist = uniqueMissingPaints.length > 0 && recipe?.faction_id != null;

  async function handleAddMissingToWishlist() {
    if (uniqueMissingPaints.length === 0) return;

    const existingNames = new Set(wishlistItems.map((w) => w.name));
    const toAdd = uniqueMissingPaints.filter(
      (p) => !existingNames.has(`${p.brand} ${p.name}`)
    );

    if (toAdd.length === 0) {
      toast.info("All missing paints already on wishlist");
      return;
    }

    try {
      for (const paint of toAdd) {
        await createWishlistItem.mutateAsync({
          name: `${paint.brand} ${paint.name}`,
          faction_id: recipe!.faction_id!,
          estimated_cost_pence: null,
          notes: `From recipe: ${recipe!.name}`,
        });
      }
      toast.success(`Added ${toAdd.length} paint${toAdd.length !== 1 ? "s" : ""} to wishlist`);
    } catch {
      toast.error("Failed to add paints to wishlist.");
    }
  }

  async function handleDuplicate() {
    if (!recipe) return;
    try {
      const newId = await duplicateRecipe.mutateAsync({
        originalId: recipe.id,
        newName: `${recipe.name} (Copy)`,
      });
      toast.success("Recipe duplicated.");
      onDuplicate(newId);
    } catch {
      toast.error("Failed to duplicate recipe.");
    }
  }

  const [stepPhotoUrls, setStepPhotoUrls] = useState<Map<number, string>>(new Map());

  const stepsKey = useMemo(
    () => steps.map((s) => `${s.id}:${s.step_photo_path ?? ""}`).join(","),
    [steps],
  );

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      const stepsWithPhotos = steps.filter((s) => s.step_photo_path);
      if (stepsWithPhotos.length === 0) {
        setStepPhotoUrls((prev) => (prev.size === 0 ? prev : new Map()));
        return;
      }
      const appDir = await appDataDir();
      const entries: [number, string][] = [];
      for (const s of stepsWithPhotos) {
        const abs = await join(appDir, s.step_photo_path!);
        entries.push([s.id, convertFileSrc(abs)]);
      }
      if (!cancelled) setStepPhotoUrls(new Map(entries));
    }
    resolve();
    return () => { cancelled = true; };
  }, [stepsKey, steps]);

  const [applyToUnitsOpen, setApplyToUnitsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
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
              {(recipe.style || recipe.surface || recipe.effect || recipe.difficulty || recipe.estimated_minutes != null) && (
                <div className="flex flex-wrap items-center gap-1.5 px-4 pt-2" data-testid="recipe-metadata">
                  {recipe.surface && (
                    <Badge variant="outline" className="text-xs">{recipe.surface}</Badge>
                  )}
                  {recipe.style && (
                    <Badge variant="outline" className="text-xs">{recipe.style}</Badge>
                  )}
                  {recipe.effect && (
                    <Badge variant="outline" className="text-xs">{recipe.effect}</Badge>
                  )}
                  {recipe.difficulty && (
                    <Badge variant="secondary" className={`text-xs ${difficultyColors[recipe.difficulty] ?? ""}`}>
                      {recipe.difficulty}
                    </Badge>
                  )}
                  {recipe.estimated_minutes != null && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="mr-1 h-3 w-3" />
                      {recipe.estimated_minutes} min
                    </Badge>
                  )}
                </div>
              )}
            </SheetHeader>

            <div className="flex flex-col gap-4 p-4">
              <Field label="Linked Unit">
                {unit ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onClick={() => {
                      onClose();
                      navigate({ to: "/collection" });
                    }}
                  >
                    {unit.name}
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
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
                {sections.length > 0 && !sectionsLoading ? (
                  <SectionedTimeline
                    sections={sections}
                    steps={steps}
                    paintMap={paintMap}
                    stepPhotoUrls={stepPhotoUrls}
                  />
                ) : (
                  <RecipeStepTimeline steps={steps} paintMap={paintMap} stepPhotoUrls={stepPhotoUrls} />
                )}
              </Field>

              {canAddToWishlist && (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={handleAddMissingToWishlist}
                  disabled={createWishlistItem.isPending}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add all missing to wishlist
                </Button>
              )}

              <Separator />

              {assignments.length > 0 && (
                <Field label="Applied to Units">
                  <div className="flex flex-col gap-2">
                    {assignments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between">
                        <span className="text-sm">{unitMap.get(a.unit_id) ?? "Unknown unit"}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate({
                              to: "/painting-mode/$assignmentId",
                              params: { assignmentId: String(a.id) },
                            })
                          }
                          data-testid={`paint-unit-btn-${a.id}`}
                        >
                          Paint
                        </Button>
                      </div>
                    ))}
                  </div>
                </Field>
              )}

              <Field label="Sessions">
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No sessions logged for this recipe yet
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {sessions.map((s) => (
                      <div key={s.id} className="text-sm" data-testid="recipe-session-row">
                        <span className="font-medium">{s.session_date}</span>
                        {" · "}
                        {unitMap.get(s.unit_id) ?? "Unknown unit"}
                        {" · "}
                        {s.duration_minutes} min
                        {s.notes && (
                          <p className="text-muted-foreground text-xs truncate">{s.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
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
              <Button
                variant="outline"
                onClick={handleDuplicate}
                disabled={duplicateRecipe.isPending}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
              <Button variant="outline" onClick={() => setApplyToUnitsOpen(true)}>
                Apply to Unit(s)
              </Button>
              <Button onClick={() => onEdit(recipe)}>Edit Recipe</Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
    {recipe && (
      <ApplyToUnitsDialog
        open={applyToUnitsOpen}
        recipe={recipe}
        onClose={() => setApplyToUnitsOpen(false)}
      />
    )}
    </>
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
