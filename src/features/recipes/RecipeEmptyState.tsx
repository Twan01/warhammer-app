import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface RecipeEmptyStateProps {
  onAdd: () => void;
}

export function RecipeEmptyState({ onAdd }: RecipeEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <BookOpen className="h-12 w-12 text-muted-foreground" />
      <p className="text-base font-semibold">No recipes yet</p>
      <p className="text-sm text-muted-foreground">
        Document your paint schemes. Add a recipe to get started.
      </p>
      <Button onClick={onAdd}>Add Recipe</Button>
    </div>
  );
}
