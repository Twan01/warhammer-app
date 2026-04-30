import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteUnit } from "@/hooks/useUnits";
import type { Unit } from "@/types/unit";

interface UnitDeleteDialogProps {
  open: boolean;
  unit: Unit | null;
  onClose: () => void;
}

export function UnitDeleteDialog({ open, unit, onClose }: UnitDeleteDialogProps) {
  const deleteUnit = useDeleteUnit();

  async function handleConfirm() {
    if (!unit) return;
    try {
      await deleteUnit.mutateAsync(unit.id);
      toast.success("Unit deleted.");
      onClose();
    } catch {
      toast.error("Something went wrong. Please try again.");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete unit?</DialogTitle>
          <DialogDescription>
            {unit
              ? `This will permanently delete "${unit.name}".`
              : "Delete the selected unit?"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Keep Unit</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleteUnit.isPending}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
