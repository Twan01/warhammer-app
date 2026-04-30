import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FactionsEmptyStateProps {
  onAdd: () => void;
}

export function FactionsEmptyState({ onAdd }: FactionsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <PackageOpen className="h-12 w-12 text-muted-foreground" />
      <p className="text-base font-semibold">No factions yet</p>
      <p className="text-sm text-muted-foreground">
        Add your first faction to start organizing your collection.
      </p>
      <Button onClick={onAdd}>Add Faction</Button>
    </div>
  );
}
