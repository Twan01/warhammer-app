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
  liveInstanceCount: number;
  onClose: () => void;
}

export function TechniqueDeleteDialog({
  open,
  technique,
  liveInstanceCount,
  onClose,
}: TechniqueDeleteDialogProps) {
  const deleteTechnique = useDeleteTechnique();

  async function handleConfirm() {
    if (!technique) return;
    try {
      await deleteTechnique.mutateAsync(technique.id);
      toast.success(
        liveInstanceCount > 0
          ? `Technique detached from ${liveInstanceCount} recipe${liveInstanceCount === 1 ? "" : "s"} and deleted.`
          : "Technique deleted.",
      );
      onClose();
    } catch {
      toast.error("Failed to delete technique. Please try again.");
      // Do NOT call onClose() — keep dialog open so the user can retry or cancel (WR-02).
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete technique?</DialogTitle>
          <DialogDescription>
            {technique && liveInstanceCount > 0
              ? `"${technique.name}" is live-linked to ${liveInstanceCount} recipe${liveInstanceCount === 1 ? "" : "s"}. Detaching will bake the current colours into those recipes before removing the technique. No recipe content will be lost.`
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
            {deleteTechnique.isPending
              ? (liveInstanceCount > 0 ? "Detaching & deleting…" : "Deleting…")
              : (liveInstanceCount > 0
                  ? `Detach ${liveInstanceCount} recipe${liveInstanceCount === 1 ? "" : "s"} & delete`
                  : "Delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
