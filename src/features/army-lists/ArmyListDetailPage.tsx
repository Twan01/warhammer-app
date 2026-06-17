import { useEffect, useMemo, useState, useCallback, useReducer, Fragment } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, History, Plus, Search, Swords } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import {
  formatArmyListForExport,
  buildClipboardText,
  buildJsonFormat,
  slugify,
  dateStamp,
} from "@/lib/exportArmyList";
import { generateBattleRosterPdf } from "@/lib/exportArmyListPdf";
import { assembleRoster } from "@/lib/exportRoster";
import { useLocale } from "@/stores/localeStore";
import { PageHeader } from "@/components/common/PageHeader";
import { ArmyListSummaryBar } from "./ArmyListSummaryBar";
import { ArmyListUnitRow } from "./ArmyListUnitRow";
import { ExportDropdown } from "./ExportDropdown";
import { DetachmentPicker } from "./DetachmentPicker";
// Phase 107: StaleDataBanner removed
import { DetachmentRulesSection } from "./DetachmentRulesSection";
import { RemindersSection } from "./RemindersSection";
import { ArmyListSheet } from "./ArmyListSheet";
import { ArmyListDeleteDialog } from "./ArmyListDeleteDialog";
import { UnitPickerDialog } from "./UnitPickerDialog";
import { LoadoutBuilderSheet } from "./LoadoutBuilderSheet";
import { EnhancementPickerSheet } from "./EnhancementPickerSheet";
import { LeaderAttachmentSheet } from "./LeaderAttachmentSheet";
import { DatasheetBrowserDialog } from "./DatasheetBrowserDialog";
import { PrintPreviewDialog } from "./PrintPreviewDialog";
import { SnapshotHistorySheet } from "./SnapshotHistorySheet";
import { SnapshotCompareDialog } from "./SnapshotCompareDialog";
import {
  detailPortalReducer,
  initialDetailPortalState,
} from "./armyListDetailReducer";

// ---------------------------------------------------------------------------
// Sortable row wrapper for dnd-kit
// ---------------------------------------------------------------------------

import type { ArmyListUnitRow as ArmyListUnitRowType, ArmyListUnitWargear } from "@/types/armyList";
import type { SyncedLeaderTargetRow } from "@/db/queries/bsdataExtended";

function SortableUnitRow({
  unit, onRemove, onConfigure, onEnhance, onAttachLeader, onToggleWarlord,
  enhancementName, isIndentedLeader, leaderName, leaderTargets,
}: {
  unit: ArmyListUnitRowType;
  onRemove: () => void;
  onConfigure: () => void;
  onEnhance: () => void;
  onAttachLeader: () => void;
  onToggleWarlord: () => void;
  enhancementName?: string;
  isIndentedLeader: boolean;
  leaderName?: string;
  leaderTargets: SyncedLeaderTargetRow[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: unit.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <tr ref={setNodeRef} style={style}>
      <td colSpan={5} className="p-0">
        <table className="w-full"><tbody>
          <ArmyListUnitRow
            unit={unit}
            onRemove={onRemove}
            onConfigure={onConfigure}
            onEnhance={onEnhance}
            onAttachLeader={onAttachLeader}
            onToggleWarlord={onToggleWarlord}
            enhancementName={enhancementName}
            isIndentedLeader={isIndentedLeader}
            leaderName={leaderName}
            leaderTargets={leaderTargets}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        </tbody></table>
      </td>
    </tr>
  );
}

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
  const {
    sheetOpen, editingList, deleteDialogOpen, deletingList,
    unitPickerOpen, loadoutUnitId, enhancementUnitId, leaderUnitId,
    datasheetBrowserOpen, printPreviewOpen,
    snapshotHistoryOpen, compareSnapshotIds, compareSnapshotLabels,
  } = state;

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

  const handleCopyToClipboard = useCallback(async () => {
    if (!list) return;
    try {
      const data = formatArmyListForExport(list, units ?? [], listEnhancements ?? [], faction?.name ?? null);
      const text = buildClipboardText(data);
      await writeText(text);
      toast.success("List copied to clipboard");
    } catch {
      toast.error("Failed to copy — check clipboard permissions");
    }
  }, [list, units, listEnhancements, faction]);

  const handleSaveJson = useCallback(async () => {
    if (!list) return;
    try {
      const data = formatArmyListForExport(list, units ?? [], listEnhancements ?? [], faction?.name ?? null);
      const jsonString = buildJsonFormat(data);
      const destination = await save({
        title: "Save Army List as JSON",
        defaultPath: `${slugify(list.name)}-${dateStamp()}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!destination) return;
      await writeTextFile(destination, jsonString);
      toast.success("List saved as JSON");
    } catch {
      toast.error("Failed to save JSON — check file permissions");
    }
  }, [list, units, listEnhancements, faction]);

  const handleSavePdf = useCallback(async () => {
    if (!list) return;
    try {
      // Build wargear map grouped by army_list_unit_id for the formatter
      const wargearMap = new Map<number, ArmyListUnitWargear[]>();
      for (const w of listWargear ?? []) {
        if (!wargearMap.has(w.army_list_unit_id)) wargearMap.set(w.army_list_unit_id, []);
        wargearMap.get(w.army_list_unit_id)!.push(w);
      }
      const data = formatArmyListForExport(
        list,
        units ?? [],
        listEnhancements ?? [],
        faction?.name ?? null,
        wargearMap,
      );
      const destination = await save({
        title: "Save Army List as PDF",
        defaultPath: `${slugify(list.name)}-${dateStamp()}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!destination) return;

      const roster = await assembleRoster({
        list,
        units: units ?? [],
        enhancements: listEnhancements ?? [],
        summary: data,
        locale,
      });
      const buffer = await generateBattleRosterPdf(roster, list.name, list.points_limit);
      await invoke("write_bytes_to_path", {
        destination,
        bytes: Array.from(new Uint8Array(buffer)),
      });
      toast.success("List saved as PDF");
    } catch {
      toast.error("Failed to generate PDF");
    }
  }, [list, units, listEnhancements, faction, listWargear, locale]);

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
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/army-lists">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Army Lists
          </Link>
        </Button>
      </div>

      <PageHeader
        title={list.name}
        subtitle={faction ? undefined : "No faction"}
        actions={
          <div className="flex items-center gap-2">
            {faction && (
              <Badge
                style={faction.color_theme ? { backgroundColor: faction.color_theme } : undefined}
                className={faction.color_theme ? "border-transparent text-white" : ""}
              >
                {faction.name}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => dispatch({ type: "OPEN_EDIT", list })}>
              Edit List
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/game-day/$listId", params: { listId: String(list.id) } })}
            >
              <Swords className="mr-2 h-4 w-4" />
              Game Day
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => dispatch({ type: "OPEN_DELETE", list })}
            >
              Delete List
            </Button>
          </div>
        }
      />

      <ArmyListSummaryBar units={units ?? []} pointsLimit={list.points_limit} enhancements={listEnhancements ?? []} />

      {/* Inline quick-add search */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Units</span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => dispatch({ type: "OPEN_UNIT_PICKER" })}>
            <Plus className="mr-2 h-4 w-4" /> Add Unit
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => dispatch({ type: "OPEN_DATASHEET_BROWSER" })}>
            <BookOpen className="mr-2 h-4 w-4" /> Browse Datasheets
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Quick add — search units by name..."
          value={quickAddSearch}
          onChange={(e) => setQuickAddSearch(e.target.value)}
          className="pl-9"
        />
        {quickAddResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
            {quickAddResults.map((r) => (
              <button
                key={r.id}
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                onClick={() => handleQuickAdd(r.id)}
              >
                <span>{r.name}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {r.category && <Badge variant="secondary" className="text-xs">{r.category}</Badge>}
                  {r.points != null && <span>{r.points}pts</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Remove</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unitsByCategory.map(([category, catUnits]) => {
                const catTotal = catUnits.reduce((s, e) => s + e.unit.effective_points, 0);
                const ownedCount = catUnits.filter((e) => e.unit.unit_id !== null).length;
                const readyCount = catUnits.filter((e) => e.unit.status_painting === "Completed").length;
                const readyPct = catUnits.length > 0 ? Math.round((readyCount / catUnits.length) * 100) : 0;
                const isCollapsed = collapsedCategories.has(category);
                return (
                  <Fragment key={category}>
                    <TableRow
                      className="bg-muted/40 hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleCategory(category)}
                    >
                      <TableCell colSpan={2} className="py-2">
                        <div className="flex items-center gap-2">
                          {isCollapsed
                            ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          }
                          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            {category}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({catUnits.length})
                          </span>
                          <span className="text-xs text-muted-foreground">
                            · {ownedCount} owned · {readyCount} ready
                          </span>
                        </div>
                        {!isCollapsed && (
                          <div className="mt-1 w-32">
                            <Progress value={readyPct} className="h-1" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {catTotal}pts
                        </span>
                      </TableCell>
                      <TableCell colSpan={2} className="py-2" />
                    </TableRow>
                    {!isCollapsed && (
                      <SortableContext items={catUnits.map((e) => e.unit.id)} strategy={verticalListSortingStrategy}>
                        {catUnits.map(({ unit: alu, isIndentedLeader }) => (
                          <SortableUnitRow
                            key={alu.id}
                            unit={alu}
                            onRemove={() => handleRemoveUnit(alu.id)}
                            onConfigure={() => dispatch({ type: "OPEN_LOADOUT", unitId: alu.id })}
                            onEnhance={() => dispatch({ type: "OPEN_ENHANCEMENT", unitId: alu.id })}
                            onAttachLeader={() => dispatch({ type: "OPEN_LEADER_ATTACH", unitId: alu.id })}
                            onToggleWarlord={() => handleToggleWarlord(alu.id)}
                            enhancementName={(listEnhancements ?? []).find((le) => le.army_list_unit_id === alu.id)?.enhancement_name}
                            isIndentedLeader={isIndentedLeader}
                            leaderName={leaderNameMap.get(alu.id)}
                            leaderTargets={leaderTargets ?? []}
                          />
                        ))}
                      </SortableContext>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </DndContext>
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

      {/* Sibling portals — Pitfall 1 (never nested) */}
      <ArmyListSheet
        key={editingList?.id ?? "new-edit"}
        open={sheetOpen}
        list={editingList}
        onClose={() => dispatch({ type: "CLOSE_SHEET" })}
      />
      <ArmyListDeleteDialog
        key={deletingList?.id ?? "none-delete"}
        open={deleteDialogOpen}
        list={deletingList}
        onClose={handleDeleteClose}
        onDeleted={handleDeleted}
      />
      <UnitPickerDialog
        open={unitPickerOpen}
        listId={listId}
        factionId={list.faction_id ?? null}
        remaining={list.points_limit != null ? list.points_limit - totalPoints : null}
        pointsLimit={list.points_limit ?? null}
        onClose={() => dispatch({ type: "CLOSE_UNIT_PICKER" })}
      />
      <LoadoutBuilderSheet
        open={loadoutUnitId !== null}
        unit={loadoutUnit}
        listId={listId}
        listFactionId={list.faction_id ?? null}
        onClose={() => dispatch({ type: "CLOSE_LOADOUT" })}
      />
      <EnhancementPickerSheet
        open={enhancementUnitId !== null}
        unit={enhancementUnit}
        list={list}
        onClose={() => dispatch({ type: "CLOSE_ENHANCEMENT" })}
      />
      <LeaderAttachmentSheet
        open={leaderUnitId !== null}
        unit={leaderUnit}
        list={list}
        units={units ?? []}
        onClose={() => dispatch({ type: "CLOSE_LEADER_ATTACH" })}
      />
      <DatasheetBrowserDialog
        open={datasheetBrowserOpen}
        listId={listId}
        factionId={list.faction_id ?? null}
        onClose={() => dispatch({ type: "CLOSE_DATASHEET_BROWSER" })}
      />
      <PrintPreviewDialog
        open={printPreviewOpen}
        list={list}
        units={units ?? []}
        enhancements={listEnhancements ?? []}
        factionName={factionName}
        onClose={() => dispatch({ type: "CLOSE_PRINT_PREVIEW" })}
      />
      <SnapshotHistorySheet
        open={snapshotHistoryOpen}
        listId={listId}
        list={list}
        units={units ?? []}
        enhancements={listEnhancements ?? []}
        factionName={factionName}
        onClose={() => dispatch({ type: "CLOSE_SNAPSHOT_HISTORY" })}
        onCompare={(ids, labels) => dispatch({ type: "OPEN_SNAPSHOT_COMPARE", ids, labels })}
      />
      <SnapshotCompareDialog
        open={compareSnapshotIds !== null}
        snapshotIds={compareSnapshotIds}
        snapshotLabels={compareSnapshotLabels}
        onClose={() => dispatch({ type: "CLOSE_SNAPSHOT_COMPARE" })}
      />
    </div>
  );
}
