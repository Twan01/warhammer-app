import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteWishlistItem } from "@/hooks/useWishlistItems";
import type { WishlistItem } from "@/types/wishlistItem";

interface WishlistItemDeleteDialogProps {
  open: boolean;
  item: WishlistItem | null;
  onClose: () => void;
}

/**
 * WISH-03 delete confirmation — uses Dialog (NOT AlertDialog; not installed,
 * per Phase 18 decision). Mirrors BattleLogDeleteDialog.
 */
export function WishlistItemDeleteDialog({
  open,
  item,
  onClose,
}: WishlistItemDeleteDialogProps) {
  const deleteMutation = useDeleteWishlistItem();

  async function handleConfirm() {
    if (!item) return;
    try {
      await deleteMutation.mutateAsync(item.id);
      toast.success("Item removed from wishlist");
      onClose();
    } catch {
      toast.error("Failed to delete item");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Wishlist Item</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove &ldquo;{item?.name}&rdquo; from your wishlist?{" "}
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
