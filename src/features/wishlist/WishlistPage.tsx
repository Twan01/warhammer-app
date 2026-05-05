import { useState, useMemo } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWishlistItems } from "@/hooks/useWishlistItems";
import { useFactions } from "@/hooks/useFactions";
import { formatCurrency } from "@/lib/formatCurrency";
import type { WishlistItem } from "@/types/wishlistItem";
import { WishlistItemRow } from "./WishlistItemRow";
import { WishlistItemSheet } from "./WishlistItemSheet";
import { WishlistItemDeleteDialog } from "./WishlistItemDeleteDialog";
import { WishlistEmptyState } from "./WishlistEmptyState";
import { PageHeader } from "@/components/common/PageHeader";

/**
 * WISH-01..04 root page. Owns ALL portal state (sibling-portal architecture —
 * Pitfall 1, never nest a Sheet/Dialog inside a list row).
 *
 * State machine:
 *   - sheetOpen + editingItem: create/edit form Sheet (null editingItem = create)
 *   - deleteDialogOpen + deletingItem: item delete confirmation
 */
export function WishlistPage() {
  const { data: items, isLoading, isError } = useWishlistItems();
  const { data: factions } = useFactions();

  // Page-level portal state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<WishlistItem | null>(null);

  // Lookup map for faction name resolution
  const factionNameById = useMemo(() => {
    const m = new Map<number, string>();
    (factions ?? []).forEach((f) => m.set(f.id, f.name));
    return m;
  }, [factions]);

  // Total estimated cost across all items (null cost treated as 0)
  const totalPence = useMemo(
    () => (items ?? []).reduce((sum, i) => sum + (i.estimated_cost_pence ?? 0), 0),
    [items],
  );

  // Handlers
  const openCreate = () => { setEditingItem(null); setSheetOpen(true); };
  const openEdit = (item: WishlistItem) => { setEditingItem(item); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setEditingItem(null); };
  const openDelete = (item: WishlistItem) => { setDeletingItem(item); setDeleteDialogOpen(true); };
  const closeDelete = () => { setDeleteDialogOpen(false); setDeletingItem(null); };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Wishlist"
        subtitle="Models you want to buy."
        actions={
          <Button onClick={openCreate}>
            <Heart className="mr-2 h-4 w-4" /> Add Item
          </Button>
        }
      />

      {isLoading && (
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Could not load wishlist. Restart the app or try again.
        </p>
      )}

      {!isLoading && !isError && (items?.length ?? 0) === 0 && (
        <WishlistEmptyState onAdd={openCreate} />
      )}

      {!isLoading && !isError && (items?.length ?? 0) > 0 && (
        <>
          {/* Total summary bar */}
          <div className="flex items-center gap-4 py-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{items!.length}</span>
            <span>items</span>
            <span className="text-border">·</span>
            <span className="font-semibold text-foreground">{formatCurrency(totalPence)}</span>
            <span>estimated</span>
          </div>

          {/* Item rows */}
          <div className="flex flex-col">
            {(items ?? []).map((item) => (
              <WishlistItemRow
                key={item.id}
                item={item}
                factionName={factionNameById.get(item.faction_id) ?? null}
                onEdit={openEdit}
                onDelete={openDelete}
              />
            ))}
          </div>
        </>
      )}

      {/* Sibling portals at page root — Pitfall 1 (NEVER nested) */}
      <WishlistItemSheet
        key={editingItem?.id ?? "new-edit"}
        open={sheetOpen}
        item={editingItem}
        onClose={closeSheet}
      />
      <WishlistItemDeleteDialog
        key={deletingItem?.id ?? "none-delete"}
        open={deleteDialogOpen}
        item={deletingItem}
        onClose={closeDelete}
      />
    </div>
  );
}
