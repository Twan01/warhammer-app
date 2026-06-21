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
import { useDeleteTechnique } from "@/hooks/useTechniques";
import type { Technique } from "@/types/technique";

export interface TechniqueDeleteDialogProps {
  open: boolean;
  technique: Technique | null;
  usageCount: number;
  onClose: () => void;
}

export function TechniqueDeleteDialog({
  open,
  technique,
  usageCount,
  onClose,
}: TechniqueDeleteDialogProps) {
  const deleteTechnique = useDeleteTechnique();

  async function handleConfirm() {
    if (!technique) return;
    try {
      await deleteTechnique.mutateAsync(technique.id);
      toast.success("Technique deleted.");
      onClose();
    } catch {
      toast.error("Failed to delete technique. Please try again.");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete technique?</DialogTitle>
          <DialogDescription>
            {technique && usageCount > 0
              ? `"${technique.name}" is used by ${usageCount} recipe${usageCount === 1 ? "" : "s"}. Deleting it will remove all applied instances. This cannot be undone.`
              : technique
              ? `This will permanently remove "${technique.name}" and all its steps. This cannot be undone.`
              : "This will permanently remove the selected technique."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Keep Technique
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteTechnique.isPending}
          >
            {deleteTechnique.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
