import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnits } from "@/hooks/useUnits";
import { useFactions } from "@/hooks/useFactions";
import type { Unit } from "@/types/unit";
import { useCollectionFilters } from "./collectionFilters";
import { applyUnitFilters } from "./applyUnitFilters";
import { UnitTable } from "./UnitTable";
import { UnitFilters } from "./UnitFilters";
import { UnitDetailSheet } from "./UnitDetailSheet";
import { UnitSheet } from "./UnitSheet";
import { UnitDeleteDialog } from "./UnitDeleteDialog";

export function CollectionPage() {
  // Data
  const { data: units, isLoading: unitsLoading, isError: unitsError } = useUnits();
  const { data: factions } = useFactions();

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Collection</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Unit
        </Button>
      </div>

      <UnitFilters units={units ?? []} />

      {unitsError ? (
        <p className="text-sm text-destructive">
          Failed to load your collection. Try refreshing the app.
        </p>
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
    </div>
  );
}
