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
import { useDeleteArmyList } from "@/hooks/useArmyLists";
import type { ArmyList } from "@/types/armyList";

interface ArmyListDeleteDialogProps {
  open: boolean;
  list: ArmyList | null;
  onClose: () => void;
}

export function ArmyListDeleteDialog({ open, list, onClose }: ArmyListDeleteDialogProps) {
  const deleteArmyList = useDeleteArmyList();

  async function handleConfirm() {
    if (!list) return;
    try {
      await deleteArmyList.mutateAsync(list.id);
      toast.success("Army list deleted.");
      onClose();
    } catch (err) {
      console.error("[ArmyListDeleteDialog] Failed to delete army list:", err);
      toast.error("Failed to delete army list. Please try again.");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete army list?</DialogTitle>
          <DialogDescription>
            {list
              ? `This will permanently delete "${list.name}" and remove all units from it.`
              : "Delete the selected army list?"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Keep List</Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteArmyList.isPending}
          >
            Delete List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
