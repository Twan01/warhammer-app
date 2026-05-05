import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { HobbyGoal } from "@/types/goal";

interface GoalDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: HobbyGoal | null;
  onConfirm: () => void;
}

export function GoalDeleteDialog({
  open,
  onOpenChange,
  goal,
  onConfirm,
}: GoalDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this goal?</DialogTitle>
          <DialogDescription>
            {goal
              ? `Are you sure you want to delete the goal '${goal.name}'? This action cannot be undone.`
              : "Delete the selected goal?"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
