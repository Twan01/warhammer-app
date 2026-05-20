import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useArmyLists, useArmyListWithUnits } from "@/hooks/useArmyLists";
import { useFactions } from "@/hooks/useFactions";
import type { ArmyList } from "@/types/armyList";
import { ArmyListCard } from "./ArmyListCard";
import { ArmyListSheet } from "./ArmyListSheet";
import { ArmyListDeleteDialog } from "./ArmyListDeleteDialog";
import { ArmyListDetailSheet } from "./ArmyListDetailSheet";
import { UnitPickerDialog } from "./UnitPickerDialog";
import { ArmyListsEmptyState } from "./ArmyListsEmptyState";
import { LoadoutBuilderSheet } from "./LoadoutBuilderSheet";
import { PageHeader } from "@/components/common/PageHeader";

/**
 * ARMY-02..06 root page. Owns ALL portal state — sibling portal architecture
 * (Pitfall 1 — never nest a Sheet/Dialog inside another).
 *
 * State machine:
 *   - selectedListId: which list's detail sheet is open
 *   - sheetOpen + editingList: create/edit form Sheet (null editingList = create)
 *   - deleteDialogOpen + deletingList: list delete confirmation
 *   - unitPickerOpen: unit picker Command palette (triggered by detail sheet)
 *
 * Architecture mirrors CollectionPage exactly. Per-card unit totals are loaded
 * via N parallel useArmyListWithUnits queries (acceptable at personal-use scale).
 */
export function ArmyListsPage() {
  const { data: lists, isLoading, isError } = useArmyLists();
  const { data: factions } = useFactions();

  // Page-level portal state
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingList, setEditingList] = useState<ArmyList | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingList, setDeletingList] = useState<ArmyList | null>(null);
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [loadoutUnitId, setLoadoutUnitId] = useState<number | null>(null);

  // Pattern: store ID, derive object from cache (selectedListId pattern)
  const selectedList = selectedListId !== null
    ? (lists ?? []).find((l) => l.id === selectedListId) ?? null
    : null;

  // Derive units for loadout sheet sibling portal
  const { data: selectedListUnits } = useArmyListWithUnits(selectedListId ?? undefined);
  const loadoutUnit = loadoutUnitId !== null
    ? (selectedListUnits ?? []).find((u) => u.id === loadoutUnitId) ?? null
    : null;

  // Handlers
  const openCreate = () => { setEditingList(null); setSheetOpen(true); };
  const openEdit = (list: ArmyList) => { setEditingList(list); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setEditingList(null); };
  const openDelete = (list: ArmyList) => { setDeletingList(list); setDeleteDialogOpen(true); };
  const closeDelete = () => {
    const wasDeleting = deletingList;
    setDeleteDialogOpen(false);
    setDeletingList(null);
    if (wasDeleting && selectedListId === wasDeleting.id) {
      setSelectedListId(null);
    }
  };
  const openDetail = (list: ArmyList) => setSelectedListId(list.id);
  const closeDetail = () => { setSelectedListId(null); setUnitPickerOpen(false); setLoadoutUnitId(null); };
  const openUnitPicker = () => setUnitPickerOpen(true);
  const closeUnitPicker = () => setUnitPickerOpen(false);
  const openLoadout = (armyListUnitId: number) => setLoadoutUnitId(armyListUnitId);
  const closeLoadout = () => setLoadoutUnitId(null);

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Army Lists"
        subtitle="Points-tracked lists for the tabletop"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New List
          </Button>
        }
      />

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Failed to load army lists. Try refreshing the app.
        </p>
      )}

      {!isLoading && !isError && (lists?.length ?? 0) === 0 && (
        <ArmyListsEmptyState onAdd={openCreate} />
      )}

      {!isLoading && !isError && (lists?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(lists ?? []).map((list) => (
            <ArmyListCardWrapper
              key={list.id}
              list={list}
              factions={factions ?? []}
              onClick={() => openDetail(list)}
            />
          ))}
        </div>
      )}

      {/* Sibling portals at page root — Pitfall 1 (never nested) */}
      <ArmyListDetailSheet
        key={selectedList?.id ?? "none-detail"}
        open={selectedListId !== null}
        list={selectedList}
        onClose={closeDetail}
        onEdit={openEdit}
        onDelete={openDelete}
        onAddUnit={openUnitPicker}
        onConfigureUnit={openLoadout}
      />
      <ArmyListSheet
        key={editingList?.id ?? "new-edit"}
        open={sheetOpen}
        list={editingList}
        onClose={closeSheet}
      />
      <ArmyListDeleteDialog
        key={deletingList?.id ?? "none-delete"}
        open={deleteDialogOpen}
        list={deletingList}
        onClose={closeDelete}
      />
      <UnitPickerDialog
        open={unitPickerOpen}
        listId={selectedListId}
        factionId={selectedList?.faction_id ?? null}
        onClose={closeUnitPicker}
      />
      <LoadoutBuilderSheet
        open={loadoutUnitId !== null}
        unit={loadoutUnit}
        listId={selectedListId}
        listFactionId={selectedList?.faction_id ?? null}
        onClose={closeLoadout}
      />
    </div>
  );
}

/**
 * Per-card wrapper that loads its own unit totals via useArmyListWithUnits.
 * N+1 hook usage is acceptable at personal-use scale (max ~10 lists expected).
 */
function ArmyListCardWrapper({
  list,
  factions,
  onClick,
}: {
  list: ArmyList;
  factions: import("@/types/faction").Faction[];
  onClick: () => void;
}) {
  const { data: units = [] } = useArmyListWithUnits(list.id);
  const faction = list.faction_id !== null
    ? factions.find((f) => f.id === list.faction_id) ?? null
    : null;
  return (
    <ArmyListCard
      list={list}
      faction={faction}
      units={units}
      onClick={onClick}
    />
  );
}
