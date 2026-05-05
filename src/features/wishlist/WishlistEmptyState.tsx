import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * WISH-02 empty state — icon-pill pattern (mirrors BattleLogEmptyState).
 */
export function WishlistEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-xl bg-muted/40 p-4">
        <Heart className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">Your wishlist is empty</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Add models you want to buy — track names, factions, and estimated cost.
        </p>
      </div>
      <Button className="mt-2" onClick={onAdd}>Add Item</Button>
    </div>
  );
}
