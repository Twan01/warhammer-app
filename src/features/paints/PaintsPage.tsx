import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableHeader, TableRow, TableHead, TableBody,
} from "@/components/ui/table";
import {
  usePaintsWithRecipeCount,
  useUpdatePaint,
  PAINTS_WITH_RECIPES_KEY,
} from "@/hooks/usePaints";
import type { PaintWithRecipeCount } from "@/types/paint";
import { PaintRow } from "./PaintRow";
import { PaintSheet } from "./PaintSheet";
import { PaintDeleteDialog } from "./PaintDeleteDialog";
import { PaintsEmptyState } from "./PaintsEmptyState";
import { PaintInventoryFilters } from "./PaintInventoryFilters.tsx";
import { usePaintInventoryFilters } from "./paintInventoryFilters";
import { applyPaintFilters } from "./applyPaintFilters";
import { PageHeader } from "@/components/common/PageHeader";

export function PaintsPage() {
  const { data: paints, isLoading, isError } = usePaintsWithRecipeCount();
  const qc = useQueryClient();
  const updatePaint = useUpdatePaint();
  const navigate = useNavigate();

  // Filter state (Zustand) — selectors keep re-renders narrow
  const brands = usePaintInventoryFilters((s) => s.brands);
  const types = usePaintInventoryFilters((s) => s.types);
  const colorFamilies = usePaintInventoryFilters((s) => s.colorFamilies);
  const runningLow = usePaintInventoryFilters((s) => s.runningLow);
  const wishlist = usePaintInventoryFilters((s) => s.wishlist);
  const clearAll = usePaintInventoryFilters((s) => s.clearAll);

  const hasAny =
    brands.length > 0 ||
    types.length > 0 ||
    colorFamilies.length > 0 ||
    runningLow ||
    wishlist;

  // Reset filters on unmount (navigation away from /paints) — matches the existing
  // ephemeral-filter pattern from useCollectionFilters.
  useEffect(() => {
    return () => {
      clearAll();
    };
  }, [clearAll]);

  const filtered = useMemo(
    () =>
      applyPaintFilters(paints ?? [], { brands, types, colorFamilies, runningLow, wishlist }),
    [paints, brands, types, colorFamilies, runningLow, wishlist],
  );

  // Sheet/dialog state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<PaintWithRecipeCount | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<PaintWithRecipeCount | null>(null);

  const openCreate = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (paint: PaintWithRecipeCount) => { setEditing(paint); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setEditing(null); };
  const openDelete = (paint: PaintWithRecipeCount) => { setDeleting(paint); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setDeleting(null); };

  // PINV-06 — inline owned toggle with optimistic update + rollback (mirrors handleToggleActive)
  function handleToggleOwned(paint: PaintWithRecipeCount) {
    const next = (paint.owned === 1 ? 0 : 1) as 0 | 1;
    const previous = qc.getQueryData<PaintWithRecipeCount[]>(PAINTS_WITH_RECIPES_KEY);
    qc.setQueryData<PaintWithRecipeCount[]>(PAINTS_WITH_RECIPES_KEY, (old) =>
      old?.map((p) => (p.id === paint.id ? { ...p, owned: next } : p)) ?? [],
    );
    updatePaint.mutate(
      { id: paint.id, owned: next },
      {
        onError: () => {
          qc.setQueryData(PAINTS_WITH_RECIPES_KEY, previous);
          toast.error("Failed to update owned status. Please try again.");
        },
      },
    );
  }

  // PINV-05 — recipe badge navigates to /recipes with paintId search param
  function handleRecipeBadgeClick(paint: PaintWithRecipeCount) {
    navigate({ to: "/recipes", search: { paintId: paint.id } });
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Paints"
        subtitle="Your paint collection, linked to recipes"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Paint
          </Button>
        }
      />

      <PaintInventoryFilters paints={paints ?? []} />

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">Failed to load paints. Try refreshing the app.</p>
      )}

      {/* Unfiltered empty state — no paints in DB at all */}
      {!isLoading && !isError && (paints?.length ?? 0) === 0 && !hasAny && (
        <PaintsEmptyState onAdd={openCreate} />
      )}

      {/* Filtered empty state — paints exist but filters narrowed to zero */}
      {!isLoading && !isError && (paints?.length ?? 0) > 0 && filtered.length === 0 && hasAny && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-muted-foreground">No paints match your filters.</p>
          <Button variant="ghost" size="sm" onClick={clearAll}>Clear filters</Button>
        </div>
      )}

      {/* Populated table */}
      {!isLoading && !isError && filtered.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Color Family</TableHead>
              <TableHead>Owned</TableHead>
              <TableHead>Recipes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((paint) => (
              <PaintRow
                key={paint.id}
                paint={paint}
                onEdit={openEdit}
                onDelete={openDelete}
                onToggleOwned={handleToggleOwned}
                onRecipeBadgeClick={handleRecipeBadgeClick}
              />
            ))}
          </TableBody>
        </Table>
      )}

      {/* POLISH-04 / Pitfall 3: key forces fresh mount when switching between create/edit modes */}
      <PaintSheet
        key={editing?.id ?? "new"}
        open={sheetOpen}
        paint={editing}
        onClose={closeSheet}
      />
      <PaintDeleteDialog
        key={deleting?.id ?? "none"}
        open={dialogOpen}
        paint={deleting}
        onClose={closeDialog}
      />
    </div>
  );
}
