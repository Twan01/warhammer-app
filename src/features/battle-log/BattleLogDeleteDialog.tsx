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
import { useDeleteBattleLog } from "@/hooks/useBattleLogs";
import type { BattleLog } from "@/types/battleLog";

interface BattleLogDeleteDialogProps {
  open: boolean;
  log: BattleLog | null;
  onClose: () => void;
}

export function BattleLogDeleteDialog({ open, log, onClose }: BattleLogDeleteDialogProps) {
  const deleteBattleLog = useDeleteBattleLog();

  async function handleConfirm() {
    if (!log) return;
    try {
      await deleteBattleLog.mutateAsync(log.id);
      toast.success("Game log deleted.");
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
          <DialogTitle>Delete this game log?</DialogTitle>
          <DialogDescription>
            {log
              ? `This will permanently delete the game against ${log.opponent_faction} on ${log.battle_date}. This cannot be undone.`
              : "Delete the selected game log?"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteBattleLog.isPending}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
