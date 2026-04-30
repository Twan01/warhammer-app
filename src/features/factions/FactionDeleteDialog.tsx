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
import { useDeleteFaction } from "@/hooks/useFactions";
import type { Faction } from "@/types/faction";

interface FactionDeleteDialogProps {
  open: boolean;
  faction: Faction | null;
  onClose: () => void;
}

export function FactionDeleteDialog({
  open,
  faction,
  onClose,
}: FactionDeleteDialogProps) {
  const deleteFaction = useDeleteFaction();

  async function handleConfirm() {
    if (!faction) return;
    try {
      await deleteFaction.mutateAsync(faction.id);
      toast.success("Faction deleted.");
      onClose();
    } catch (err) {
      const message = ((err as Error)?.message ?? String(err)).toLowerCase();
      // Pitfall 4: case-insensitive partial match — error wrapping may vary across plugin versions
      if (message.includes("foreign key")) {
        toast.error("Cannot delete faction — it still has units assigned.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      // Always close the dialog after the attempt — toast carries the outcome
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete faction?</DialogTitle>
          <DialogDescription>
            {faction
              ? `This will permanently delete "${faction.name}". Units assigned to this faction must be reassigned first.`
              : "This will permanently delete the selected faction."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Keep Faction
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteFaction.isPending}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
