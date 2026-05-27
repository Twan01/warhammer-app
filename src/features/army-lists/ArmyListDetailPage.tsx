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
import { getSyncFreshness } from "@/lib/syncFreshness";
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
} from "@/hooks/useArmyLists";
import { useUnits } from "@/hooks/useUnits";
import { useWahapediaFactionId, useRulesSyncMeta } from "@/hooks/useDatasheet";
import { useLeaderTargets } from "@/hooks/useLeaderTargets";
import { useFactions } from "@/hooks/useFactions";
import { groupUnitsWithLeaders } from "@/lib/groupUnitsWithLeaders";
import type { ArmyList } from "@/types/armyList";
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
import { PageHeader } from "@/components/common/PageHeader";
import { ArmyListSummaryBar } from "./ArmyListSummaryBar";
import { ArmyListUnitRow } from "./ArmyListUnitRow";
import { ExportDropdown } from "./ExportDropdown";
import { DetachmentPicker } from "./DetachmentPicker";
import { StaleDataBanner } from "./StaleDataBanner";
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

// ---------------------------------------------------------------------------
// Local reducer for portal state on the detail page
// ---------------------------------------------------------------------------

type DetailPortalState = {
  sheetOpen: boolean;
  editingList: ArmyList | null;
  deleteDialogOpen: boolean;
  deletingList: ArmyList | null;
  unitPickerOpen: boolean;
  loadoutUnitId: number | null;
  enhancementUnitId: number | null;
  leaderUnitId: number | null;
  datasheetBrowserOpen: boolean;
  printPreviewOpen: boolean;
  snapshotHistoryOpen: boolean;
  compareSnapshotIds: [number, number] | null;
  compareSnapshotLabels: [string, string] | null;
};

const initialDetailPortalState: DetailPortalState = {
  sheetOpen: false,
  editingList: null,
  deleteDialogOpen: false,
  deletingList: null,
  unitPickerOpen: false,
  loadoutUnitId: null,
  enhancementUnitId: null,
  leaderUnitId: null,
  datasheetBrowserOpen: false,
  printPreviewOpen: false,
  snapshotHistoryOpen: false,
  compareSnapshotIds: null,
  compareSnapshotLabels: null,
};

type DetailPortalAction =
  | { type: "OPEN_EDIT"; list: ArmyList }
  | { type: "CLOSE_SHEET" }
  | { type: "OPEN_DELETE"; list: ArmyList }
  | { type: "CLOSE_DELETE" }
  | { type: "OPEN_UNIT_PICKER" }
  | { type: "CLOSE_UNIT_PICKER" }
  | { type: "OPEN_LOADOUT"; unitId: number }
  | { type: "CLOSE_LOADOUT" }
  | { type: "OPEN_ENHANCEMENT"; unitId: number }
  | { type: "CLOSE_ENHANCEMENT" }
  | { type: "OPEN_LEADER_ATTACH"; unitId: number }
  | { type: "CLOSE_LEADER_ATTACH" }
  | { type: "OPEN_DATASHEET_BROWSER" }
  | { type: "CLOSE_DATASHEET_BROWSER" }
  | { type: "OPEN_PRINT_PREVIEW" }
  | { type: "CLOSE_PRINT_PREVIEW" }
  | { type: "OPEN_SNAPSHOT_HISTORY" }
  | { type: "CLOSE_SNAPSHOT_HISTORY" }
  | { type: "OPEN_SNAPSHOT_COMPARE"; ids: [number, number]; labels: [string, string] }
  | { type: "CLOSE_SNAPSHOT_COMPARE" };

function detailPortalReducer(
  state: DetailPortalState,
  action: DetailPortalAction,
): DetailPortalState {
  switch (action.type) {
    case "OPEN_EDIT":
      return { ...state, sheetOpen: true, editingList: action.list };
    case "CLOSE_SHEET":
      return { ...state, sheetOpen: false, editingList: null };
    case "OPEN_DELETE":
      return { ...state, deleteDialogOpen: true, deletingList: action.list };
    case "CLOSE_DELETE":
      return { ...state, deleteDialogOpen: false, deletingList: null };
    case "OPEN_UNIT_PICKER":
      return { ...state, unitPickerOpen: true };
    case "CLOSE_UNIT_PICKER":
      return { ...state, unitPickerOpen: false };
    case "OPEN_LOADOUT":
      return { ...state, loadoutUnitId: action.unitId };
    case "CLOSE_LOADOUT":
      return { ...state, loadoutUnitId: null };
    case "OPEN_ENHANCEMENT":
      return { ...state, enhancementUnitId: action.unitId };
    case "CLOSE_ENHANCEMENT":
      return { ...state, enhancementUnitId: null };
    case "OPEN_LEADER_ATTACH":
      return { ...state, leaderUnitId: action.unitId };
    case "CLOSE_LEADER_ATTACH":
      return { ...state, leaderUnitId: null };
    case "OPEN_DATASHEET_BROWSER":
      return { ...state, datasheetBrowserOpen: true };
    case "CLOSE_DATASHEET_BROWSER":
      return { ...state, datasheetBrowserOpen: false };
    case "OPEN_PRINT_PREVIEW":
      return { ...state, printPreviewOpen: true };
    case "CLOSE_PRINT_PREVIEW":
      return { ...state, printPreviewOpen: false };
    case "OPEN_SNAPSHOT_HISTORY":
      return { ...state, snapshotHistoryOpen: true };
    case "CLOSE_SNAPSHOT_HISTORY":
      return {
        ...state,
        snapshotHistoryOpen: false,
        compareSnapshotIds: null,
        compareSnapshotLabels: null,
      };
    case "OPEN_SNAPSHOT_COMPARE":
      return {
        ...state,
        compareSnapshotIds: action.ids,
        compareSnapshotLabels: action.labels,
      };
    case "CLOSE_SNAPSHOT_COMPARE":
      return { ...state, compareSnapshotIds: null, compareSnapshotLabels: null };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Sortable row wrapper for dnd-kit
// ---------------------------------------------------------------------------

import type { ArmyListUnitRow as ArmyListUnitRowType } from "@/types/armyList";
import type { SyncedLeaderTargetRow } from "@/db/queries/bsdataExtended";
import type { SyncFreshness } from "@/lib/syncFreshness";

function SortableUnitRow({
  unit, totalPoints, pointsLimit, freshness, onRemove, onConfigure, onEnhance, onAttachLeader, onToggleWarlord,
  enhancementName, isIndentedLeader, leaderName, leaderTargets,
}: {
  unit: ArmyListUnitRowType;
  totalPoints: number;
  pointsLimit: number | null;
  freshness: SyncFreshness;
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
            totalPoints={totalPoints}
            pointsLimit={pointsLimit}
            freshness={freshness}
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
  const { data: list } = useArmyList(listId);
  const { data: units, isLoading } = useArmyListWithUnits(listId);
  const { data: listEnhancements } = useEnhancementsByList(listId);
  const { data: factions } = useFactions();
  const { data: collectionUnits = [] } = useUnits();
  const removeUnitFromList = useRemoveUnitFromList();
  const updateArmyList = useUpdateArmyList();
  const setWarlord = useSetWarlord();
  const clearWarlord = useClearWarlord();
  const reorderUnits = useReorderArmyListUnits();
  const addUnitToList = useAddUnitToList();
  const clearDetachment = useClearArmyListDetachment();
  const { data: syncMeta } = useRulesSyncMeta();

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

  const { data: wahapediaFactionId } = useWahapediaFactionId(faction?.name);

  const freshness = useMemo(
    () => getSyncFreshness(syncMeta?.last_sync_at ?? null),
    [syncMeta?.last_sync_at],
  );

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
    reorderUnits.mutate({ listId, updates });
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
        onError: (err) => {
          console.error("[ArmyListDetailPage] Failed to remove unit:", err);
          toast.error("Failed to remove unit. Please try again.");
        },
      },
    );
  }

  function handleSaveListNotes() {
    if (!list) return;
    if (notesDraft === (list.notes ?? "")) {
      toast.success("Notes saved.");
      return;
    }
    updateArmyList.mutate(
      { id: list.id, notes: notesDraft ?? "" },
      {
        onSuccess: () => toast.success("Notes saved."),
        onError: (err) => {
          console.error("[ArmyListDetailPage] Failed to save notes:", err);
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
    } catch (err) {
      console.error("[ArmyListDetailPage] Clipboard copy failed:", err);
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
    } catch (err) {
      console.error("[ArmyListDetailPage] JSON save failed:", err);
      toast.error("Failed to save JSON — check file permissions");
    }
  }, [list, units, listEnhancements, faction]);

  const handleSavePdf = useCallback(async () => {
    if (!list) return;
    try {
      const data = formatArmyListForExport(list, units ?? [], listEnhancements ?? [], faction?.name ?? null);
      const destination = await save({
        title: "Save Army List as PDF",
        defaultPath: `${slugify(list.name)}-${dateStamp()}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!destination) return;

      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;

      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const grandTotal = data.totalPoints + data.enhancementTotal;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(list.name, 20, 25);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 51, 51);
      doc.text(
        `Faction: ${data.factionName ?? "None"}  |  Detachment: ${list.detachment_name ?? "None"}  |  ${dateStamp()}`,
        20,
        33,
      );
      doc.setTextColor(0, 0, 0);

      const unitRows = data.sortedUnits.map((u) => {
        let name = u.displayName;
        if (u.isGhost) name += " (Planned)";
        if (u.isWarlord) name += " (Warlord)";
        const notes = u.leaderLabel ?? u.enhancementName ?? "";
        return [name, `${u.points}pts`, notes];
      });

      autoTable(doc, {
        startY: 40,
        head: [["Unit", "Points", "Notes"]],
        body: unitRows,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [60, 60, 60] },
        margin: { left: 20, right: 20 },
      });

      if (data.enhancements.length > 0) {
        const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 100;
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("Enhancements", 20, lastY + 10);

        autoTable(doc, {
          startY: lastY + 14,
          head: [["Enhancement", "Points"]],
          body: data.enhancements.map((e) => [e.enhancement_name, `${e.enhancement_points}pts`]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [60, 60, 60] },
          margin: { left: 20, right: 20 },
        });
      }

      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 120;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Total: ${grandTotal}pts${list.points_limit ? ` / ${list.points_limit}pts` : ""}`,
        20,
        finalY + 10,
      );

      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(153, 153, 153);
      doc.text("Generated by HobbyForge", pageWidth - 20, pageHeight - 10, { align: "right" });

      const buffer = doc.output("arraybuffer");
      await invoke("write_bytes_to_path", {
        destination,
        bytes: Array.from(new Uint8Array(buffer)),
      });
      toast.success("List saved as PDF");
    } catch (err) {
      console.error("[ArmyListDetailPage] PDF export failed:", err);
      toast.error("Failed to generate PDF");
    }
  }, [list, units, listEnhancements, faction]);

  // Navigate back after successful delete
  const handleDeleteClose = useCallback(() => {
    const wasDeleting = deletingList;
    dispatch({ type: "CLOSE_DELETE" });
    if (wasDeleting && wasDeleting.id === listId) {
      navigate({ to: "/army-lists" });
    }
  }, [deletingList, listId, navigate]);

  if (!list) {
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

      <ArmyListSummaryBar units={units ?? []} pointsLimit={list.points_limit} freshness={freshness} enhancements={listEnhancements ?? []} />

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
                            totalPoints={totalPoints}
                            pointsLimit={list.points_limit}
                            freshness={freshness}
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
            rulesSynced={syncMeta?.last_sync_at != null}
            onChange={handleDetachmentSelect}
            onClear={handleDetachmentClear}
          />
        </div>
        <StaleDataBanner lastSyncAt={syncMeta?.last_sync_at} />
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
      />
      <UnitPickerDialog
        open={unitPickerOpen}
        listId={listId}
        factionId={list.faction_id ?? null}
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
