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
import { useDeletePaint } from "@/hooks/usePaints";
import type { Paint } from "@/types/paint";

interface PaintDeleteDialogProps {
  open: boolean;
  paint: Paint | null;
  onClose: () => void;
}

export function PaintDeleteDialog({ open, paint, onClose }: PaintDeleteDialogProps) {
  const deletePaint = useDeletePaint();

  async function handleConfirm() {
    if (!paint) return;
    try {
      await deletePaint.mutateAsync(paint.id);
      toast.success("Paint deleted.");
      onClose();
    } catch (err) {
      const message = ((err as Error)?.message ?? String(err)).toLowerCase();
      if (message.includes("foreign key")) {
        toast.error("Cannot delete paint — it's used in a recipe step.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete paint?</DialogTitle>
          <DialogDescription>
            {paint
              ? `This will permanently delete "${paint.brand} ${paint.name}".`
              : "Delete the selected paint?"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Keep Paint</Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deletePaint.isPending}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
