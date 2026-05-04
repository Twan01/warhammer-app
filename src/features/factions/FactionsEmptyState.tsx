import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FactionsEmptyStateProps {
  onAdd: () => void;
}

export function FactionsEmptyState({ onAdd }: FactionsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-xl bg-muted/40 p-4">
        <Shield className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">No factions yet</p>
        <p className="text-sm text-muted-foreground">
          Add your first faction to start organizing your collection.
        </p>
      </div>
      <Button className="mt-2" onClick={onAdd}>Add Faction</Button>
    </div>
  );
}
