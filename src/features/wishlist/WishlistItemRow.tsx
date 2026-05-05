import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatCurrency";
import type { WishlistItem } from "@/types/wishlistItem";

interface WishlistItemRowProps {
  item: WishlistItem;
  factionName: string | null;
  onEdit: (item: WishlistItem) => void;
  onDelete: (item: WishlistItem) => void;
}

/**
 * WISH-02 + WISH-03 — compact row with group-hover Edit/Delete actions.
 * Mirrors BattleLogRow group-hover pattern (Pitfall 1 — actions use e.stopPropagation).
 */
export function WishlistItemRow({
  item,
  factionName,
  onEdit,
  onDelete,
}: WishlistItemRowProps) {
  function handleEditClick(e: React.MouseEvent) {
    e.stopPropagation();
    onEdit(item);
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(item);
  }

  // Format date as short locale string
  const dateLabel = item.created_at
    ? new Date(item.created_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="group relative flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-muted/50 transition-colors duration-150 border-b border-border/40">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: name + faction */}
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-medium truncate">{item.name}</p>
          {factionName && (
            <span className="text-xs text-muted-foreground shrink-0">{factionName}</span>
          )}
        </div>
        {/* Row 2: cost + notes */}
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatCurrency(item.estimated_cost_pence)}
          </span>
          {item.notes && (
            <span
              className="text-xs text-muted-foreground truncate max-w-[200px]"
              title={item.notes}
            >
              {item.notes}
            </span>
          )}
        </div>
      </div>

      {/* Date */}
      <span className="text-xs text-muted-foreground shrink-0">{dateLabel}</span>

      {/* Hover action buttons — invisible until group hover */}
      <div className="invisible group-hover:visible flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Edit wishlist item"
          onClick={handleEditClick}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          aria-label="Delete wishlist item"
          onClick={handleDeleteClick}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
