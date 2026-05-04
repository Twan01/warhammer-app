import { Swords } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ArmyListsEmptyStateProps {
  onAdd: () => void;
}

export function ArmyListsEmptyState({ onAdd }: ArmyListsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-xl bg-muted/40 p-4">
        <Swords className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">No army lists yet</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Build a list to track points, units, and your battle-ready percentage.
        </p>
      </div>
      <Button className="mt-2" onClick={onAdd}>New list</Button>
    </div>
  );
}
