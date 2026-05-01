import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteRecipe } from "@/hooks/useRecipes";
import type { PaintingRecipe } from "@/types/recipe";

export interface RecipeDeleteDialogProps {
  open: boolean;
  recipe: PaintingRecipe | null;
  onClose: () => void;
}

export function RecipeDeleteDialog({ open, recipe, onClose }: RecipeDeleteDialogProps) {
  const deleteRecipe = useDeleteRecipe();

  async function handleConfirm() {
    if (!recipe) return;
    try {
      await deleteRecipe.mutateAsync(recipe.id);
      toast.success("Recipe deleted.");
      onClose();
    } catch {
      toast.error("Failed to delete recipe. Please try again.");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete recipe?</DialogTitle>
          <DialogDescription>
            {recipe
              ? `This will permanently remove "${recipe.name}" and all its steps. This cannot be undone.`
              : "This will permanently remove the selected recipe."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteRecipe.isPending}
          >
            Delete recipe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
