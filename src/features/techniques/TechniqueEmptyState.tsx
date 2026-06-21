import { Button } from "@/components/ui/button";

export interface TechniqueEmptyStateProps {
  onAdd: () => void;
}

export function TechniqueEmptyState({ onAdd }: TechniqueEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <h3 className="text-lg font-semibold">No techniques yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Author a reusable painting technique — OSL, NMM, and more — then apply it across
        recipes.
      </p>
      <Button onClick={onAdd}>Add Technique</Button>
    </div>
  );
}
