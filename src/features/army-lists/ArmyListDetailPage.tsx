import { useEffect, useMemo, useState, useCallback, useReducer } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, History } from "lucide-react";
import { toast } from "sonner";
import {
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArmyListDetailHeader } from "./ArmyListDetailHeader";
import { ArmyListQuickAdd } from "./ArmyListQuickAdd";
import { useArmyListExport } from "./useArmyListExport";
import { ArmyListUnitTable } from "./ArmyListUnitTable";
import { ArmyListPortals } from "./ArmyListPortals";
import {
  useArmyListWithUnits,
  useArmyList,
  useRemoveUnitFromList,
  useUpdateArmyList,
  useClearArmyListDetachment,
  useEnhancementsByList,
  useSetWarlord,
  useClearWarlord,
  useReorderArmyListUnits,
  useAddUnitToList,
  useListWargear,
} from "@/hooks/useArmyLists";
import { useUnits } from "@/hooks/useUnits";
import { useUdbMeta } from "@/hooks/useUdbMeta";
import { useLeaderTargets } from "@/hooks/useLeaderTargets";
import { useFactions } from "@/hooks/useFactions";
import { groupUnitsWithLeaders } from "@/lib/groupUnitsWithLeaders";
import { useLocale } from "@/stores/localeStore";
import { ArmyListSummaryBar } from "./ArmyListSummaryBar";
import { ExportDropdown } from "./ExportDropdown";
import { DetachmentPicker } from "./DetachmentPicker";
import { DetachmentRulesSection } from "./DetachmentRulesSection";
import { RemindersSection } from "./RemindersSection";
import {
  detailPortalReducer,
  initialDetailPortalState,
} from "./armyListDetailReducer";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArmyListDetailPage({ listId }: { listId: number }) {
  const navigate = useNavigate();
  const { data: list, isLoading: listLoading } = useArmyList(listId);
  const { data: units, isLoading } = useArmyListWithUnits(listId);
  const { data: listEnhancements } = useEnhancementsByList(listId);
  const { data: listWargear } = useListWargear(list?.id);
  const { data: factions } = useFactions();
  const { data: collectionUnits = [] } = useUnits();
  const removeUnitFromList = useRemoveUnitFromList();
  const updateArmyList = useUpdateArmyList();
  const setWarlord = useSetWarlord();
  const clearWarlord = useClearWarlord();
  const reorderUnits = useReorderArmyListUnits();
  const addUnitToList = useAddUnitToList();
  const clearDetachment = useClearArmyListDetachment();
  const { data: udbMeta } = useUdbMeta();
  const locale = useLocale();

  const [state, dispatch] = useReducer(detailPortalReducer, initialDetailPortalState);
  const { loadoutUnitId, enhancementUnitId, leaderUnitId } = state;

  const faction = useMemo(
    () => (list?.faction_id ? (factions ?? []).find((f) => f.id === list.faction_id) ?? null : null),
    [factions, list?.faction_id],
  );

  // Resolve the UDB faction id from the faction's stored wahapedia_faction_id
  // column (the canonical mapping, e.g. Ultramarines -> "SM"). Do NOT re-derive
  // it by name-matching against udb_factions: sub-factions like "Ultramarines"
  // have no udb_factions row (only the parent "Space Marines"), and punctuation
  // variants like "Tau Empire" vs "T'au Empire" would also fail to match.
  const wahapediaFactionId = faction?.wahapedia_faction_id ?? null;

  const factionIdStr = list?.faction_id != null ? String(list.faction_id) : null;
  const { data: leaderTargets } = useLeaderTargets(factionIdStr);

  const groupedUnits = useMemo(
    () => groupUnitsWithLeaders(units ?? []),
    [units],
  );

  const unitsByCategory = useMemo(() => {
    const map = new Map<string, { unit: (typeof groupedUnits)[number]["unit"]; isIndentedLeader: boolean }[]>();
    for (const entry of groupedUnits) {
      const cat = entry.unit.unit_category ?? "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(entry);
    }
    const roleOrder = ["Character", "Epic Hero", "Battleline", "Infantry", "Mounted", "Beast", "Vehicle", "Monster", "Fortification", "Dedicated Transport"];
    return Array.from(map.entries()).sort((a, b) => {
      const ai = roleOrder.indexOf(a[0]);
      const bi = roleOrder.indexOf(b[0]);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [groupedUnits]);

  const leaderNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const u of units ?? []) {
      if (u.leader_attached_to_id != null) {
        map.set(u.leader_attached_to_id, u.unit_name);
      }
    }
    return map;
  }, [units]);

  const totalPoints = useMemo(
    () => (units ?? []).reduce((sum, u) => sum + u.effective_points, 0),
    [units],
  );

  const [notesDraft, setNotesDraft] = useState(list?.notes ?? "");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [quickAddSearch, setQuickAddSearch] = useState("");

  useEffect(() => {
    setNotesDraft(list?.notes ?? "");
  }, [list?.id, list?.notes]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Quick-add: filter collection units + synced rules units by search
  const quickAddResults = useMemo(() => {
    const q = quickAddSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    const factionFilter = list?.faction_id ?? null;
    const collectionMatches = collectionUnits
      .filter((u) => (factionFilter === null || u.faction_id === factionFilter) && u.name.toLowerCase().includes(q))
      .slice(0, 8)
      .map((u) => ({ type: "collection" as const, id: u.id, name: u.name, category: u.category, points: u.points }));
    return collectionMatches;
  }, [quickAddSearch, collectionUnits, list?.faction_id]);

  // Derived objects for portal components
  const loadoutUnit = loadoutUnitId !== null
    ? (units ?? []).find((u) => u.id === loadoutUnitId) ?? null
    : null;
  const enhancementUnit = enhancementUnitId !== null
    ? (units ?? []).find((u) => u.id === enhancementUnitId) ?? null
    : null;
  const leaderUnit = leaderUnitId !== null
    ? (units ?? []).find((u) => u.id === leaderUnitId) ?? null
    : null;
  const factionName = faction?.name ?? null;

  // ---- Handlers ----

  function handleToggleWarlord(armyListUnitId: number) {
    const unit = (units ?? []).find((u) => u.id === armyListUnitId);
    if (!unit) return;
    if (unit.is_warlord === 1) {
      clearWarlord.mutate(listId, {
        onSuccess: () => toast.success("Warlord cleared."),
      });
    } else {
      setWarlord.mutate(
        { army_list_unit_id: armyListUnitId, list_id: listId },
        { onSuccess: () => toast.success("Warlord set.") },
      );
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const allUnits = groupedUnits.map((e) => e.unit);
    const oldIndex = allUnits.findIndex((u) => u.id === active.id);
    const newIndex = allUnits.findIndex((u) => u.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...allUnits];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    const updates = reordered.map((u, i) => ({ id: u.id, sort_order: i }));
    reorderUnits.mutate(
      { listId, updates },
      { onError: () => toast.error("Failed to reorder units. Please try again.") },
    );
  }

  function toggleCategory(category: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function handleQuickAdd(unitId: number) {
    addUnitToList.mutate(
      { list_id: listId, unit_id: unitId },
      {
        onSuccess: () => {
          toast.success("Unit added.");
          setQuickAddSearch("");
        },
        onError: () => toast.error("Failed to add unit."),
      },
    );
  }

  function handleRemoveUnit(armyListUnitId: number) {
    removeUnitFromList.mutate(
      { army_list_unit_id: armyListUnitId, list_id: listId },
      {
        onSuccess: () => toast.success("Unit removed."),
        onError: () => {
          toast.error("Failed to remove unit. Please try again.");
        },
      },
    );
  }

  function handleSaveListNotes() {
    if (!list) return;
    if (notesDraft === (list.notes ?? "")) {
      return;
    }
    updateArmyList.mutate(
      { id: list.id, notes: notesDraft ?? "" },
      {
        onSuccess: () => toast.success("Notes saved."),
        onError: () => {
          toast.error("Failed to save notes. Please try again.");
        },
      },
    );
  }

  function handleDetachmentSelect(detachmentId: string, detachmentName: string) {
    if (!list) return;
    updateArmyList.mutate(
      { id: list.id, detachment_id: detachmentId, detachment_name: detachmentName },
      { onSuccess: () => toast.success("Detachment selected.") },
    );
  }

  function handleDetachmentClear() {
    if (!list) return;
    clearDetachment.mutate(list.id, {
      onSuccess: () => toast.success("Detachment cleared."),
    });
  }

  const { handleCopyToClipboard, handleSaveJson, handleSavePdf } = useArmyListExport({
    list,
    units: units ?? [],
    listEnhancements: listEnhancements ?? [],
    faction,
    listWargear: listWargear ?? [],
    locale,
  });

  const handleDeleteClose = useCallback(() => {
    dispatch({ type: "CLOSE_DELETE" });
  }, []);

  // Navigate back only after the delete actually succeeds (not on a failed delete).
  const handleDeleted = useCallback(() => {
    navigate({ to: "/army-lists" });
  }, [navigate]);

  if (listLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/army-lists">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Army Lists
            </Link>
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/army-lists">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Army Lists
          </Link>
        </Button>
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold">List not found</h2>
          <p className="text-sm text-muted-foreground mt-1">This army list may have been deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <ArmyListDetailHeader
        list={list}
        faction={faction}
        onEdit={() => dispatch({ type: "OPEN_EDIT", list })}
        onGameDay={() => navigate({ to: "/game-day/$listId", params: { listId: String(list.id) } })}
        onDelete={() => dispatch({ type: "OPEN_DELETE", list })}
      />

      <ArmyListSummaryBar units={units ?? []} pointsLimit={list.points_limit} enhancements={listEnhancements ?? []} />

      <ArmyListQuickAdd
        quickAddSearch={quickAddSearch}
        setQuickAddSearch={setQuickAddSearch}
        quickAddResults={quickAddResults}
        onAdd={handleQuickAdd}
        onOpenUnitPicker={() => dispatch({ type: "OPEN_UNIT_PICKER" })}
        onOpenDatasheetBrowser={() => dispatch({ type: "OPEN_DATASHEET_BROWSER" })}
      />

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {!isLoading && (units?.length ?? 0) === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No units yet — search above or click "Add Unit".
        </p>
      )}

      {!isLoading && (units?.length ?? 0) > 0 && (
        <ArmyListUnitTable
          unitsByCategory={unitsByCategory}
          collapsedCategories={collapsedCategories}
          onToggleCategory={toggleCategory}
          leaderNameMap={leaderNameMap}
          leaderTargets={leaderTargets ?? []}
          listEnhancements={listEnhancements ?? []}
          listId={listId}
          sensors={sensors}
          onDragEnd={handleDragEnd}
          onRemove={handleRemoveUnit}
          onConfigure={(id) => dispatch({ type: "OPEN_LOADOUT", unitId: id })}
          onEnhance={(id) => dispatch({ type: "OPEN_ENHANCEMENT", unitId: id })}
          onAttachLeader={(id) => dispatch({ type: "OPEN_LEADER_ATTACH", unitId: id })}
          onToggleWarlord={handleToggleWarlord}
        />
      )}

      <Separator />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Detachment</label>
          <DetachmentPicker
            factionWahapediaId={wahapediaFactionId ?? undefined}
            value={list.detachment_id}
            valueName={list.detachment_name}
            disabled={!faction}
            rulesSynced={udbMeta != null}
            onChange={handleDetachmentSelect}
            onClear={handleDetachmentClear}
          />
        </div>
      </div>

      <DetachmentRulesSection detachmentId={list.detachment_id} />
      <RemindersSection />

      <div className="flex items-center gap-2">
        <ExportDropdown
          onCopyToClipboard={handleCopyToClipboard}
          onPrint={() => dispatch({ type: "OPEN_PRINT_PREVIEW" })}
          onSaveJson={handleSaveJson}
          onSavePdf={handleSavePdf}
        />
        <Button variant="outline" size="sm" onClick={() => dispatch({ type: "OPEN_SNAPSHOT_HISTORY" })}>
          <History className="mr-2 h-4 w-4" />
          Snapshots
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold" htmlFor="list-notes">List notes</label>
        <textarea
          id="list-notes"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Notes for this army list..."
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleSaveListNotes}
            disabled={updateArmyList.isPending}
          >
            Save notes
          </Button>
        </div>
      </div>

      <ArmyListPortals
        state={state}
        dispatch={dispatch}
        list={list}
        listId={listId}
        totalPoints={totalPoints}
        units={units ?? []}
        listEnhancements={listEnhancements ?? []}
        factionName={factionName}
        loadoutUnit={loadoutUnit}
        enhancementUnit={enhancementUnit}
        leaderUnit={leaderUnit}
        handleDeleteClose={handleDeleteClose}
        handleDeleted={handleDeleted}
      />
    </div>
  );
}
