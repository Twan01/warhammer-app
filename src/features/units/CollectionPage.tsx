import { useMemo, useState } from "react";
import { Plus, LayoutList, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnits, useUpdateUnit, UNITS_KEY } from "@/hooks/useUnits";
import { useFactions } from "@/hooks/useFactions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Unit } from "@/types/unit";
import { useCollectionFilters } from "./collectionFilters";
import { applyUnitFilters } from "./applyUnitFilters";
import { UnitTable } from "./UnitTable";
import { UnitFilters } from "./UnitFilters";
import { UnitDetailSheet } from "./UnitDetailSheet";
import { UnitSheet } from "./UnitSheet";
import { UnitDeleteDialog } from "./UnitDeleteDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { UnitPhotoWithUrl } from "@/hooks/useUnitPhotos";
import { useLatestUnitPhotos } from "@/hooks/useUnitPhotos";
import { useCollectionViewMode } from "@/hooks/useCollectionViewMode";
import { UnitGallery } from "./UnitGallery";
import { DatasheetImportDialog } from "./DatasheetImportDialog";
import type { DatasheetImportPayload, DatasheetImportResolution } from "@/types/datasheet";
import { PageHeader } from "@/components/common/PageHeader";

export function CollectionPage() {
  // Data
  const { data: units, isLoading: unitsLoading, isError: unitsError } = useUnits();
  const { data: factions } = useFactions();
  const qc = useQueryClient();
  const updateUnit = useUpdateUnit();

  // Filters (Zustand)
  const search = useCollectionFilters((s) => s.search);
  const factionsSel = useCollectionFilters((s) => s.factions);
  const statusesSel = useCollectionFilters((s) => s.statuses);
  const categoriesSel = useCollectionFilters((s) => s.categories);
  const activeOnly = useCollectionFilters((s) => s.activeOnly);
  const clearAll = useCollectionFilters((s) => s.clearAll);

  const hasActiveFilters =
    search.length > 0 ||
    factionsSel.length > 0 ||
    statusesSel.length > 0 ||
    categoriesSel.length > 0 ||
    activeOnly;

  const filteredUnits = useMemo(
    () =>
      applyUnitFilters(units ?? [], {
        search, factions: factionsSel, statuses: statusesSel, categories: categoriesSel, activeOnly,
      }),
    [units, search, factionsSel, statusesSel, categoriesSel, activeOnly]
  );

  // COLL-01 — batch photo map for gallery thumbnails
  const { data: latestPhotos } = useLatestUnitPhotos();

  // Sheet/dialog state — Pitfall 6: keep ID, derive unit from `units`
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const selectedUnit = useMemo(
    () => (selectedUnitId !== null ? (units ?? []).find((u) => u.id === selectedUnitId) ?? null : null),
    [units, selectedUnitId]
  );

  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null); // null = create mode

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);

  // JOUR-05 sibling lightbox — owned at CollectionPage level so the Dialog is a
  // sibling of UnitDetailSheet's Sheet portal (never nested — see Phase 8 STATE.md).
  const [lightboxPhoto, setLightboxPhoto] = useState<UnitPhotoWithUrl | null>(null);

  // DS-08 — conflict-resolution dialog state. Owned by CollectionPage so the
  // Dialog is a sibling of UnitDetailSheet's Sheet portal (not nested).
  const [conflictPayload, setConflictPayload] = useState<DatasheetImportPayload | null>(null);
  const [pendingResolution, setPendingResolution] = useState<{
    resolution: DatasheetImportResolution;
    payload: DatasheetImportPayload;
  } | null>(null);

  const [viewMode, setViewMode] = useCollectionViewMode();

  // Handlers
  const handleRowClick = (unit: Unit) => setSelectedUnitId(unit.id);
  const handleCloseDetail = () => setSelectedUnitId(null);

  const handleAdd = () => {
    setEditingUnit(null);
    setEditSheetOpen(true);
  };
  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setEditSheetOpen(true);
  };
  const handleCloseEdit = () => {
    setEditSheetOpen(false);
    setEditingUnit(null);
  };

  const handleDelete = (unit: Unit) => {
    setDeletingUnit(unit);
    setDeleteDialogOpen(true);
  };
  function handleToggleActive(unit: Unit) {
    const next = (unit.is_active_project === 1 ? 0 : 1) as 0 | 1;
    const previous = qc.getQueryData<Unit[]>(UNITS_KEY);
    qc.setQueryData<Unit[]>(UNITS_KEY, (old) =>
      old?.map((u) => (u.id === unit.id ? { ...u, is_active_project: next } : u)) ?? [],
    );
    updateUnit.mutate(
      { id: unit.id, is_active_project: next },
      {
        onError: () => {
          qc.setQueryData(UNITS_KEY, previous);
          toast.error("Failed to update project status. Changes were not saved.");
        },
      },
    );
  }

  const handleCloseDelete = () => {
    setDeleteDialogOpen(false);
    setDeletingUnit(null);
    // If we deleted the currently-open detail, close that too
    if (selectedUnit && deletingUnit && selectedUnit.id === deletingUnit.id) {
      setSelectedUnitId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Collection"
        subtitle="All units you own, tracked and filterable"
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Table view"
              className={viewMode === "table" ? "bg-muted" : ""}
              onClick={() => setViewMode("table")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Gallery view"
              className={viewMode === "gallery" ? "bg-muted" : ""}
              onClick={() => setViewMode("gallery")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" /> Add Unit
            </Button>
          </>
        }
      />

      <UnitFilters units={units ?? []} />

      {unitsError ? (
        <p className="text-sm text-destructive">
          Failed to load your collection. Try refreshing the app.
        </p>
      ) : viewMode === "gallery" ? (
        <UnitGallery
          data={filteredUnits}
          factions={factions ?? []}
          isLoading={unitsLoading}
          hasActiveFilters={hasActiveFilters}
          latestPhotos={latestPhotos}
          onRowClick={handleRowClick}
          onAdd={handleAdd}
          onClearFilters={clearAll}
        />
      ) : (
        <UnitTable
          data={filteredUnits}
          factions={factions ?? []}
          isLoading={unitsLoading}
          hasActiveFilters={hasActiveFilters}
          onRowClick={handleRowClick}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClearFilters={clearAll}
          onToggleActive={handleToggleActive}
        />
      )}

      {/* Pitfall 4: siblings, not nested children. POLISH-04: key forces fresh mount per unit. */}
      <UnitDetailSheet
        key={selectedUnit?.id ?? "none-detail"}
        open={selectedUnitId !== null}
        unit={selectedUnit}
        onClose={handleCloseDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPhotoClick={(photo) => setLightboxPhoto(photo)}
        onDatasheetConflict={(payload) => setConflictPayload(payload)}
        pendingImportResolution={pendingResolution}
        onClearImportResolution={() => setPendingResolution(null)}
      />

      <UnitSheet
        key={editingUnit?.id ?? "new-edit"}
        open={editSheetOpen}
        unit={editingUnit}
        onClose={handleCloseEdit}
      />

      <UnitDeleteDialog
        key={deletingUnit?.id ?? "none-delete"}
        open={deleteDialogOpen}
        unit={deletingUnit}
        onClose={handleCloseDelete}
      />

      {/* JOUR-05 sibling photo lightbox — mounted at page level, NOT nested in UnitDetailSheet.
          See Phase 8 STATE.md: "Sibling Sheet/Dialog portal pattern — never nest Radix portals". */}
      <Dialog open={!!lightboxPhoto} onOpenChange={(o) => { if (!o) setLightboxPhoto(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{lightboxPhoto?.stage_label ?? ""}</DialogTitle>
            <DialogDescription>{lightboxPhoto?.caption ?? ""}</DialogDescription>
          </DialogHeader>
          {lightboxPhoto && (
            <img
              src={lightboxPhoto.assetUrl}
              alt={lightboxPhoto.stage_label ?? "Unit photo"}
              className="max-h-[70vh] w-auto mx-auto object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* DS-08 — conflict-resolution dialog. Sibling to Sheet portal — NEVER nested.
          PlaybookTab raises onDatasheetConflict via UnitDetailSheet → setConflictPayload.
          When the user confirms, we drop the payload back into pendingResolution and
          PlaybookTab subscribes via useEffect, applies the resolution, then calls
          onClearImportResolution to reset state. */}
      <DatasheetImportDialog
        open={conflictPayload !== null}
        conflicts={conflictPayload?.conflicts ?? []}
        onConfirm={(resolution) => {
          if (conflictPayload) setPendingResolution({ resolution, payload: conflictPayload });
          setConflictPayload(null);
        }}
        onClose={() => setConflictPayload(null)}
      />
    </div>
  );
}
