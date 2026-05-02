import { Swords } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ArmyListsEmptyStateProps {
  onAdd: () => void;
}

export function ArmyListsEmptyState({ onAdd }: ArmyListsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <Swords className="h-12 w-12 text-muted-foreground" />
      <p className="text-base font-semibold">Build your first army list</p>
      <p className="text-sm text-muted-foreground max-w-md">
        Create a list to track which units you're taking to the table and see your battle-ready percentage at a glance.
      </p>
      <Button onClick={onAdd}>New List</Button>
    </div>
  );
}
