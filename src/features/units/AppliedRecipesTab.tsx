import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ClipboardList, Palette, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useAssignmentsByUnit,
  useDeleteAssignment,
} from "@/hooks/useRecipeAssignments";
import { useRecipes } from "@/hooks/useRecipes";
import { AssignmentChecklist } from "@/features/recipes/AssignmentChecklist";
import type { RecipeAssignment } from "@/types/recipeAssignment";

interface AppliedRecipesTabProps {
  unitId: number;
  onApplyRecipe: () => void;
}

/**
 * AR-04 -- Tab panel showing all applied recipes for a unit.
 *
 * Each assignment renders a bordered card with recipe name, delete button,
 * and embedded AssignmentChecklist (gated on assignment.id).
 */
export function AppliedRecipesTab({ unitId, onApplyRecipe }: AppliedRecipesTabProps) {
  const navigate = useNavigate();
  const { data: assignments = [], isLoading } = useAssignmentsByUnit(unitId);
  const { data: recipes = [] } = useRecipes();
  const deleteAssignment = useDeleteAssignment();

  // Build recipe name lookup
  const recipeMap = useMemo(() => {
    const m = new Map<number, (typeof recipes)[number]>();
    for (const r of recipes) m.set(r.id, r);
    return m;
  }, [recipes]);

  function handleDelete(assignment: RecipeAssignment) {
    // P2: all 3 fields required for cache invalidation
    deleteAssignment.mutate(
      { id: assignment.id, unitId: assignment.unit_id, recipeId: assignment.recipe_id },
      {
        onSuccess: () => toast.success("Recipe removed."),
        onError: () => toast.error("Failed to remove recipe."),
      },
    );
  }

  if (assignments.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <ClipboardList className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No recipes applied yet.</p>
        <Button size="sm" onClick={onApplyRecipe}>
          Apply Recipe
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4" aria-busy={isLoading}>
      {assignments.map((assignment) => {
        const recipe = recipeMap.get(assignment.recipe_id);
        return (
          <div
            key={assignment.id}
            className="flex flex-col gap-2 border rounded-md p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium flex-1 min-w-0 truncate">
                {recipe?.name ?? "Unknown recipe"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate({
                    to: "/painting-mode/$assignmentId",
                    params: { assignmentId: String(assignment.id) },
                  })
                }
                data-testid={`paint-btn-${assignment.id}`}
              >
                <Palette size={14} className="mr-1.5" />
                Paint
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(assignment)}
                aria-label={`Remove ${recipe?.name ?? "recipe"}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {assignment.id !== undefined && (
              <AssignmentChecklist
                assignment={assignment}
                recipeId={assignment.recipe_id}
                unitId={unitId}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
