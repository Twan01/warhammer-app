import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useCreateAssignment } from "@/hooks/useRecipeAssignments";
import { useRecipes } from "@/hooks/useRecipes";
import { useRecipeSections } from "@/hooks/useRecipeSections";
import { useRecipePaints } from "@/hooks/useRecipePaints";
import { usePaints } from "@/hooks/usePaints";
import { useFactions } from "@/hooks/useFactions";
import { SectionedTimeline } from "./SectionedTimeline";
import { RecipeStepTimeline } from "./RecipeStepTimeline";

interface ApplyRecipeDialogProps {
  open: boolean;
  unitId: number;
  factionId?: number | null;
  onClose: () => void;
}

/**
 * AR-02 -- Searchable recipe picker with section/step preview before applying.
 *
 * Two-step flow:
 *   1. Picker view: Command palette listing all recipes, searchable.
 *   2. Preview view: SectionedTimeline or RecipeStepTimeline preview with confirm.
 *
 * Rendered as SIBLING to Sheet (not inside SheetContent) to avoid z-index issues (P6).
 */
export function ApplyRecipeDialog({
  open,
  unitId,
  factionId,
  onClose,
}: ApplyRecipeDialogProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) setSelectedRecipeId(null);
  }, [open]);

  const { data: recipes = [] } = useRecipes();
  const { data: factions = [] } = useFactions();
  const { data: sections = [] } = useRecipeSections(selectedRecipeId ?? undefined);
  const { data: steps = [] } = useRecipePaints(selectedRecipeId ?? undefined);
  const { data: paints = [] } = usePaints();
  const createAssignment = useCreateAssignment();

  // Build faction lookup
  const factionMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const f of factions) m.set(f.id, f.name);
    return m;
  }, [factions]);

  // Split recipes into suggested (faction match) and other groups
  const { suggested, other } = useMemo(() => {
    if (factionId == null) {
      return { suggested: recipes, other: [] as typeof recipes };
    }
    const s: typeof recipes = [];
    const o: typeof recipes = [];
    for (const r of recipes) {
      if (r.faction_id === factionId) s.push(r);
      else o.push(r);
    }
    return { suggested: s, other: o };
  }, [recipes, factionId]);

  // Build paintMap for preview
  const paintMap = useMemo(() => {
    const m = new Map<number, (typeof paints)[number]>();
    for (const p of paints) m.set(p.id, p);
    return m;
  }, [paints]);

  const selectedRecipe = useMemo(
    () => recipes.find((r) => r.id === selectedRecipeId) ?? null,
    [recipes, selectedRecipeId],
  );

  function handleConfirm() {
    if (selectedRecipeId === null) return;
    createAssignment.mutate(
      { unit_id: unitId, recipe_id: selectedRecipeId },
      {
        onSuccess: () => {
          toast.success("Recipe applied.");
          onClose();
        },
        onError: () => toast.error("Failed to apply recipe. Please try again."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="p-0 sm:max-w-[480px]">
        {selectedRecipeId === null ? (
          <>
            <DialogHeader className="px-4 pt-4">
              <DialogTitle>Apply Recipe</DialogTitle>
              <DialogDescription>
                Search and select a recipe to apply to this unit.
              </DialogDescription>
            </DialogHeader>
            <Command>
              <CommandInput placeholder="Search recipes..." />
              <CommandList>
                <CommandEmpty>No recipes found.</CommandEmpty>
                {suggested.length > 0 && (
                  <CommandGroup heading={factionId != null && other.length > 0 ? `Suggested (${suggested.length})` : undefined}>
                    {suggested.map((recipe) => (
                      <CommandItem
                        key={recipe.id}
                        value={recipe.name}
                        onSelect={() => setSelectedRecipeId(recipe.id)}
                      >
                        <span className="flex-1">{recipe.name}</span>
                        {recipe.faction_id !== null && factionMap.has(recipe.faction_id) && (
                          <Badge variant="secondary" className="ml-auto">
                            {factionMap.get(recipe.faction_id)}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {other.length > 0 && (
                  <CommandGroup heading={`Other (${other.length})`}>
                    {other.map((recipe) => (
                      <CommandItem
                        key={recipe.id}
                        value={recipe.name}
                        onSelect={() => setSelectedRecipeId(recipe.id)}
                      >
                        <span className="flex-1">{recipe.name}</span>
                        {recipe.faction_id !== null && factionMap.has(recipe.faction_id) && (
                          <Badge variant="secondary" className="ml-auto">
                            {factionMap.get(recipe.faction_id)}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </>
        ) : (
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedRecipeId(null)}
                aria-label="Back to recipe list"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-sm font-semibold flex-1">
                {selectedRecipe?.name ?? "Recipe"}
              </h3>
              <Badge variant="outline">{steps.length} steps</Badge>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {sections.length > 0 ? (
                <SectionedTimeline
                  sections={sections}
                  steps={steps}
                  paintMap={paintMap}
                />
              ) : (
                <RecipeStepTimeline steps={steps} paintMap={paintMap} />
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={createAssignment.isPending}
              >
                Apply Recipe
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
