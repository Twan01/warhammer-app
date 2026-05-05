import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoalEmptyStateProps {
  onAdd: () => void;
}

export function GoalEmptyState({ onAdd }: GoalEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-xl bg-muted/40 p-4">
        <Target className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">No goals set yet</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Set your first painting target to track your hobby progress.
        </p>
      </div>
      <Button className="mt-2" onClick={onAdd}>
        Set Goal
      </Button>
    </div>
  );
}
