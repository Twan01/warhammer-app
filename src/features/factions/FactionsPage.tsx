import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFactions } from "@/hooks/useFactions";
import { useUnits } from "@/hooks/useUnits";
import type { Faction } from "@/types/faction";
import type { Unit } from "@/types/unit";
import { FactionCard } from "./FactionRow";
import { FactionSheet } from "./FactionSheet";
import { FactionDeleteDialog } from "./FactionDeleteDialog";
import { FactionsEmptyState } from "./FactionsEmptyState";
import { UnitSheet } from "@/features/units/UnitSheet";
import { UnitDeleteDialog } from "@/features/units/UnitDeleteDialog";

export function FactionsPage() {
  const { data: factions, isLoading: factionsLoading, isError: factionsError } = useFactions();
  const { data: units } = useUnits();

  // Faction CRUD state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Faction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<Faction | null>(null);

  // Unit CRUD state
  const [unitSheetOpen, setUnitSheetOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [defaultFactionIdForCreate, setDefaultFactionIdForCreate] = useState<number | null>(null);

  // Group units by faction_id for rendering
  const unitsByFaction = useMemo(() => {
    const map = new Map<number, Unit[]>();
    for (const unit of units ?? []) {
      const list = map.get(unit.faction_id) ?? [];
      list.push(unit);
      map.set(unit.faction_id, list);
    }
    return map;
  }, [units]);

  // Faction actions
  const openCreate = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (faction: Faction) => { setEditing(faction); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setEditing(null); };
  const openDelete = (faction: Faction) => { setDeleting(faction); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setDeleting(null); };

  // Unit actions
  const openAddUnit = (factionId: number) => {
    setEditingUnit(null);
    setDefaultFactionIdForCreate(factionId);
    setUnitSheetOpen(true);
  };
  const openEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setDefaultFactionIdForCreate(null);
    setUnitSheetOpen(true);
  };
  const closeUnitSheet = () => {
    setUnitSheetOpen(false);
    setEditingUnit(null);
    setDefaultFactionIdForCreate(null);
  };
  const openDeleteUnit = (unit: Unit) => { setDeletingUnit(unit); setUnitDialogOpen(true); };
  const closeUnitDialog = () => { setUnitDialogOpen(false); setDeletingUnit(null); };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Factions</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Faction
        </Button>
      </div>

      {factionsLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {factionsError && (
        <p className="text-sm text-destructive">
          Failed to load factions. Try refreshing.
        </p>
      )}

      {!factionsLoading && !factionsError && (factions?.length ?? 0) === 0 && (
        <FactionsEmptyState onAdd={openCreate} />
      )}

      {!factionsLoading && !factionsError && (factions?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-4">
          {factions!.map((faction) => (
            <FactionCard
              key={faction.id}
              faction={faction}
              units={unitsByFaction.get(faction.id) ?? []}
              onEditFaction={openEdit}
              onDeleteFaction={openDelete}
              onAddUnit={openAddUnit}
              onEditUnit={openEditUnit}
              onDeleteUnit={openDeleteUnit}
            />
          ))}
        </div>
      )}

      {/* POLISH-04 / Pitfall 3: key forces a fresh mount when switching between create/edit modes
          and between different factions. */}
      <FactionSheet
        key={editing?.id ?? "new"}
        open={sheetOpen}
        faction={editing}
        onClose={closeSheet}
      />

      <FactionDeleteDialog
        key={deleting?.id ?? "none"}
        open={dialogOpen}
        faction={deleting}
        onClose={closeDialog}
      />

      {/* POLISH-04 / Pitfall 3: key forces fresh mount when switching between units. */}
      <UnitSheet
        key={editingUnit?.id ?? `new-${defaultFactionIdForCreate}`}
        open={unitSheetOpen}
        unit={editingUnit}
        defaultFactionId={defaultFactionIdForCreate ?? undefined}
        onClose={closeUnitSheet}
      />

      <UnitDeleteDialog
        key={deletingUnit?.id ?? "none-unit"}
        open={unitDialogOpen}
        unit={deletingUnit}
        onClose={closeUnitDialog}
      />
    </div>
  );
}
