import { useMemo, useState } from "react";
import { Plus, LayoutList, LayoutGrid, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ShowcaseMode } from "./ShowcaseMode";
import { useUnitsEnriched, useUpdateUnit, UNITS_ENRICHED_KEY } from "@/hooks/useUnits";
import { useFactions } from "@/hooks/useFactions";
import { useUdbSubFactions, useUdbSubFactionUnitIds } from "@/hooks/useUnitDatabase";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Unit, EnrichedUnit } from "@/types/unit";
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
import type { DatasheetImportPayload } from "@/types/datasheet";
import { PageHeader } from "@/components/common/PageHeader";

export function CollectionPage() {
  // Data
  const { data: units, isLoading: unitsLoading, isError: unitsError } = useUnitsEnriched();
  const { data: factions } = useFactions();
  const qc = useQueryClient();
  const updateUnit = useUpdateUnit();

  // Filters (Zustand)
  const search = useCollectionFilters((s) => s.search);
  const factionsSel = useCollectionFilters((s) => s.factions);
  const statusesSel = useCollectionFilters((s) => s.statuses);
  const categoriesSel = useCollectionFilters((s) => s.categories);
  const activeOnly = useCollectionFilters((s) => s.activeOnly);
  const battleReady = useCollectionFilters((s) => s.battleReady);
  const subFactionFilter = useCollectionFilters((s) => s.subFactionFilter);
  // Phase 138-03 D-06: UDB → Collection deep-link filter
  const udbUnitIdFilter = useCollectionFilters((s) => s.udbUnitIdFilter);
  const clearAll = useCollectionFilters((s) => s.clearAll);

  // Sub-faction filtering: only when exactly 1 faction selected
  const singleFactionId = factionsSel.length === 1 ? factionsSel[0] : null;
  const udbFactionId = singleFactionId != null
    ? factions?.find((f) => f.id === singleFactionId)?.wahapedia_faction_id ?? null
    : null;

  const { data: subFactions = [] } = useUdbSubFactions(udbFactionId);
  const { data: subFactionUnitIds } = useUdbSubFactionUnitIds(udbFactionId, subFactionFilter);

  const subFactionIdSet = useMemo(
    () => new Set(subFactionUnitIds ?? []),
    [subFactionUnitIds],
  );

  const hasActiveFilters =
    search.length > 0 ||
    factionsSel.length > 0 ||
    statusesSel.length > 0 ||
    categoriesSel.length > 0 ||
    activeOnly ||
    battleReady ||
    subFactionFilter !== null ||
    udbUnitIdFilter !== null;

  const preFilteredUnits = useMemo(
    () =>
      applyUnitFilters(units ?? [], {
        search, factions: factionsSel, statuses: statusesSel, categories: categoriesSel, activeOnly, battleReady, udbUnitIdFilter,
      }),
    [units, search, factionsSel, statusesSel, categoriesSel, activeOnly, battleReady, udbUnitIdFilter]
  );

  const filteredUnits = useMemo(
    () =>
      subFactionFilter !== null && subFactionIdSet.size > 0
        ? preFilteredUnits.filter((u) => u.udb_unit_id != null && subFactionIdSet.has(u.udb_unit_id))
        : preFilteredUnits,
    [preFilteredUnits, subFactionFilter, subFactionIdSet],
  );

  // COLL-01 — batch photo map for gallery thumbnails
  const { data: latestPhotos } = useLatestUnitPhotos();

  // DISP-02/03 — Showcase Mode: only units that have a photo
  const showcaseUnits = useMemo(
    () => filteredUnits.filter((u) => latestPhotos?.has(u.id)),
    [filteredUnits, latestPhotos],
  );

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

  const [viewMode, setViewMode] = useCollectionViewMode();
  const [showcaseOpen, setShowcaseOpen] = useState(false);

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
    const previousEnriched = qc.getQueryData<EnrichedUnit[]>(UNITS_ENRICHED_KEY);
    qc.setQueryData<EnrichedUnit[]>(UNITS_ENRICHED_KEY, (old) =>
      old?.map((u) => (u.id === unit.id ? { ...u, is_active_project: next } : u)) ?? [],
    );
    updateUnit.mutate(
      { id: unit.id, is_active_project: next },
      {
        onError: () => {
          qc.setQueryData(UNITS_ENRICHED_KEY, previousEnriched);
          toast.error("Failed to update project status. Changes were not saved.");
        },
      },
    );
  }

  const handleCloseDelete = () => {
    setDeleteDialogOpen(false);
    // Compare by ID — selectedUnit may already be null from cache invalidation.
    if (deletingUnit && selectedUnitId === deletingUnit.id) {
      setSelectedUnitId(null);
    }
    setDeletingUnit(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Collection"
        subtitle="All units you own, tracked and filterable"
        actions={
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Enter Showcase Mode"
                    disabled={showcaseUnits.length === 0}
                    onClick={() => setShowcaseOpen(true)}
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {showcaseUnits.length === 0
                  ? "No photos to showcase"
                  : "Enter Showcase Mode"}
              </TooltipContent>
            </Tooltip>
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

      <UnitFilters units={units ?? []} subFactions={subFactions} />

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

      {/* Pitfall 4: siblings, not nested children.
          NOTE: Do NOT use key={unit?.id} on Radix Dialog/Sheet wrappers — changing
          the key while open transitions to false causes React to unmount the component
          before Radix can run close cleanup (focus trap release, body pointer-events
          reset, scroll lock removal), freezing the entire UI. These components already
          guard null unit via conditional rendering. */}
      <UnitDetailSheet
        open={selectedUnitId !== null}
        unit={selectedUnit}
        onClose={handleCloseDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPhotoClick={(photo) => setLightboxPhoto(photo)}
      />

      <UnitSheet
        open={editSheetOpen}
        unit={editingUnit}
        onClose={handleCloseEdit}
      />

      <UnitDeleteDialog
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

      <DatasheetImportDialog
        open={conflictPayload !== null}
        conflicts={conflictPayload?.conflicts ?? []}
        onConfirm={() => setConflictPayload(null)}
        onClose={() => setConflictPayload(null)}
      />

      {/* DISP-02/03 — Showcase Mode overlay. Sibling to all Sheet/Dialog portals — NEVER nested.
          Mounts as a fixed inset-0 overlay; handles fullscreen via Tauri API. */}
      {showcaseOpen && latestPhotos && (
        <ShowcaseMode
          units={showcaseUnits}
          photos={latestPhotos}
          factions={factions ?? []}
          onClose={() => setShowcaseOpen(false)}
        />
      )}
    </div>
  );
}
