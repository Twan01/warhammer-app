import { Kanban } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface KanbanEmptyStateProps {
  onAddProject: () => void;
}

export function KanbanEmptyState({ onAddProject }: KanbanEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <Kanban className="h-12 w-12 text-muted-foreground" />
      <p className="text-base font-semibold">No active projects</p>
      <p className="text-sm text-muted-foreground">
        Mark a unit as active project to see it here.
      </p>
      <Button onClick={onAddProject}>Add project</Button>
    </div>
  );
}
