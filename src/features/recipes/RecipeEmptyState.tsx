import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface RecipeEmptyStateProps {
  onAdd: () => void;
}

export function RecipeEmptyState({ onAdd }: RecipeEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-xl bg-muted/40 p-4">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">No recipes yet</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Document a paint scheme to keep your colour choices consistent across models.
        </p>
      </div>
      <Button className="mt-2" onClick={onAdd}>New recipe</Button>
    </div>
  );
}
