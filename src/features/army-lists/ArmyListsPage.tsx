import { useReducer } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useArmyLists, useArmyListWithUnits } from "@/hooks/useArmyLists";
import { useFactions } from "@/hooks/useFactions";
import type { ArmyList } from "@/types/armyList";
import { useEnhancementsByList } from "@/hooks/useArmyLists";
import { armyListsReducer, initialArmyListsState } from "./armyListsReducer";
import { ArmyListCard } from "./ArmyListCard";
import { ArmyListSheet } from "./ArmyListSheet";
import { ArmyListDeleteDialog } from "./ArmyListDeleteDialog";
import { ArmyListsEmptyState } from "./ArmyListsEmptyState";
import { PageHeader } from "@/components/common/PageHeader";

/**
 * ARMY-02..06 root page — card grid of army lists.
 *
 * Clicking a card navigates to /army-lists/$listId (ArmyListDetailPage).
 * This page only owns create/edit sheet + delete dialog portal state.
 * All detail-level portals (unit picker, loadout, etc.) live on the detail page.
 *
 * Per-card unit totals are loaded via N parallel useArmyListWithUnits queries
 * (acceptable at personal-use scale).
 */
export function ArmyListsPage() {
  const { data: lists, isLoading, isError } = useArmyLists();
  const { data: factions } = useFactions();
  const navigate = useNavigate();

  // Centralized portal state (ARCH-04) — only create/edit/delete remain on the list page
  const [state, dispatch] = useReducer(armyListsReducer, initialArmyListsState);
  const { sheetOpen, editingList, deleteDialogOpen, deletingList } = state;

  // Handlers
  const openCreate = () => dispatch({ type: "OPEN_CREATE" });
  const closeSheet = () => dispatch({ type: "CLOSE_SHEET" });
  const closeDelete = () => dispatch({ type: "CLOSE_DELETE" });
  const openDetail = (list: ArmyList) =>
    navigate({ to: "/army-lists/$listId", params: { listId: String(list.id) } });

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

      {/* Sibling portals — only create/edit + delete remain on the list page */}
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
  const { data: enhancements = [] } = useEnhancementsByList(list.id);
  const enhancementTotal = enhancements.reduce((s, e) => s + e.enhancement_points, 0);
  const faction = list.faction_id !== null
    ? factions.find((f) => f.id === list.faction_id) ?? null
    : null;
  return (
    <ArmyListCard
      list={list}
      faction={faction}
      units={units}
      enhancementTotal={enhancementTotal}
      onClick={onClick}
    />
  );
}
