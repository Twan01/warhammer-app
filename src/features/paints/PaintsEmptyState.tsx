import { Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaintsEmptyStateProps {
  onAdd: () => void;
}

export function PaintsEmptyState({ onAdd }: PaintsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <Droplets className="h-12 w-12 text-muted-foreground" />
      <p className="text-base font-semibold">No paints yet</p>
      <p className="text-sm text-muted-foreground">
        Add paints to track your collection and link them to recipes.
      </p>
      <Button onClick={onAdd}>Add Paint</Button>
    </div>
  );
}
