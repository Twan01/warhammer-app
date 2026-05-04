import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface KanbanEmptyStateProps {
  onAddProject: () => void;
}

export function KanbanEmptyState({ onAddProject }: KanbanEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-xl bg-muted/40 p-4">
        <Layers className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">No active projects</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Mark a unit as an active project from Collection to see it here.
        </p>
      </div>
      <Button className="mt-2" onClick={onAddProject}>Add Project</Button>
    </div>
  );
}
