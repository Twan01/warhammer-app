import { useEffect, useMemo, useState, useCallback, Fragment } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, History, Plus, Swords } from "lucide-react";
import { toast } from "sonner";
import { getSyncFreshness } from "@/lib/syncFreshness";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  useArmyListWithUnits,
  useRemoveUnitFromList,
  useUpdateArmyList,
  useClearArmyListDetachment,
  useEnhancementsByList,
} from "@/hooks/useArmyLists";
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
import { ArmyListSummaryBar } from "./ArmyListSummaryBar";
import { ArmyListUnitRow } from "./ArmyListUnitRow";
import { ExportDropdown } from "./ExportDropdown";
import { DetachmentPicker } from "./DetachmentPicker";
import { StaleDataBanner } from "./StaleDataBanner";
import { DetachmentRulesSection } from "./DetachmentRulesSection";
import { RemindersSection } from "./RemindersSection";

interface ArmyListDetailSheetProps {
  open: boolean;
  list: ArmyList | null;
  onClose: () => void;
  onEdit: (list: ArmyList) => void;
  onDelete: (list: ArmyList) => void;
  /**
   * Triggered when the user clicks "Add Unit" inside the sheet.
   * The parent (ArmyListsPage) opens a sibling-portal UnitPickerDialog
   * — this Sheet does NOT own the dialog state (Pitfall 1).
   */
  onAddUnit: () => void;
  /**
   * Phase 90 — Triggered when the user clicks "Configure" on a unit row.
   * The parent (ArmyListsPage) opens a sibling-portal LoadoutBuilderSheet
   * — this Sheet does NOT own the dialog state (Pitfall 5).
   */
  onConfigureUnit: (armyListUnitId: number) => void;
  /**
   * Phase 91 — Opens the sibling-portal EnhancementPickerSheet for a unit.
   * This Sheet does NOT own the dialog state.
   */
  onEnhanceUnit: (armyListUnitId: number) => void;
  /**
   * Phase 92 — Opens the sibling-portal LeaderAttachmentSheet for a unit.
   * This Sheet does NOT own the dialog state.
   */
  onAttachLeader: (armyListUnitId: number) => void;
  /**
   * Phase 93 — Triggered when the user clicks "Browse Datasheets".
   * The parent (ArmyListsPage) opens a sibling-portal DatasheetBrowserDialog.
   */
  onBrowseDatasheets: () => void;
  /**
   * Phase 94 — Opens the sibling-portal PrintPreviewDialog.
   * This Sheet does NOT own the dialog state.
   */
  onPrintPreview: () => void;
  /**
   * Phase 95 — Opens the sibling-portal SnapshotHistorySheet.
   * This Sheet does NOT own the dialog state.
   */
  onOpenSnapshots: () => void;
}

export function ArmyListDetailSheet({
  open, list, onClose, onEdit, onDelete, onAddUnit, onConfigureUnit, onEnhanceUnit, onAttachLeader, onBrowseDatasheets, onPrintPreview, onOpenSnapshots,
}: ArmyListDetailSheetProps) {
  const { data: units, isLoading } = useArmyListWithUnits(list?.id);
  const { data: listEnhancements } = useEnhancementsByList(list?.id);
  const { data: factions } = useFactions();
  const navigate = useNavigate();
  const removeUnitFromList = useRemoveUnitFromList();
  const updateArmyList = useUpdateArmyList();
  const clearDetachment = useClearArmyListDetachment();
  const { data: syncMeta } = useRulesSyncMeta();

  const faction = useMemo(
    () => (list?.faction_id ? (factions ?? []).find((f) => f.id === list.faction_id) ?? null : null),
    [factions, list?.faction_id],
  );

  const { data: wahapediaFactionId } = useWahapediaFactionId(faction?.name);

  const freshness = useMemo(
    () => getSyncFreshness(syncMeta?.last_sync_at ?? null),
    [syncMeta?.last_sync_at],
  );

  // Phase 92 — Leader targets for this faction
  const factionIdStr = list?.faction_id != null ? String(list.faction_id) : null;
  const { data: leaderTargets } = useLeaderTargets(factionIdStr);

  // Phase 92 — Group units with their attached leaders for visual nesting
  const groupedUnits = useMemo(
    () => groupUnitsWithLeaders(units ?? []),
    [units],
  );

  // Group units by category for sectioned display
  const unitsByCategory = useMemo(() => {
    const map = new Map<string, { unit: (typeof groupedUnits)[number]["unit"]; isIndentedLeader: boolean }[]>();
    for (const entry of groupedUnits) {
      const cat = entry.unit.unit_category ?? "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(entry);
    }
    // Sort categories: known battlefield roles first, then alphabetical
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

  // Phase 92 — Lookup: target unit ID -> attached leader unit name
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

  // Local draft for the list-level notes textarea.
  const [notesDraft, setNotesDraft] = useState(list?.notes ?? "");

  // Reset draft when the list prop changes (Pitfall 6 — even with key prop forcing
  // remount, this useEffect documents the intent and protects against future code
  // that might omit the key).
  useEffect(() => {
    setNotesDraft(list?.notes ?? "");
  }, [list?.id, list?.notes]);

  function handleRemoveUnit(armyListUnitId: number) {
    if (!list) return;
    removeUnitFromList.mutate(
      { army_list_unit_id: armyListUnitId, list_id: list.id },
      {
        onSuccess: () => toast.success("Unit removed."),
        onError: (err) => {
          console.error("[ArmyListDetailSheet] Failed to remove unit:", err);
          toast.error("Failed to remove unit. Please try again.");
        },
      },
    );
  }

  function handleSaveListNotes() {
    if (!list) return;
    if (notesDraft === (list.notes ?? "")) {
      toast.success("Notes saved.");  // No-op save — give user feedback regardless
      return;
    }
    updateArmyList.mutate(
      {
        id: list.id,
        // Pitfall 5: updateArmyList uses COALESCE($6, notes) — pass "" to clear,
        // never null (null preserves the old value).
        notes: notesDraft ?? "",
      },
      {
        onSuccess: () => toast.success("Notes saved."),
        onError: (err) => {
          console.error("[ArmyListDetailSheet] Failed to save notes:", err);
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

  // Phase 94 — Export handlers
  const handleCopyToClipboard = useCallback(async () => {
    if (!list) return;
    try {
      const data = formatArmyListForExport(list, units ?? [], listEnhancements ?? [], faction?.name ?? null);
      const text = buildClipboardText(data);
      await writeText(text);
      toast.success("List copied to clipboard");
    } catch (err) {
      console.error("[ArmyListDetailSheet] Clipboard copy failed:", err);
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
      if (!destination) return; // user cancelled
      await writeTextFile(destination, jsonString);
      toast.success("List saved as JSON");
    } catch (err) {
      console.error("[ArmyListDetailSheet] JSON save failed:", err);
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
      if (!destination) return; // user cancelled

      // Lazy-load jsPDF and jspdf-autotable (Pitfall 6: both in same async scope)
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;

      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const grandTotal = data.totalPoints + data.enhancementTotal;

      // Header — army name
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(list.name, 20, 25);

      // Metadata line
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 51, 51);
      doc.text(
        `Faction: ${data.factionName ?? "None"}  |  Detachment: ${list.detachment_name ?? "None"}  |  ${dateStamp()}`,
        20,
        33,
      );
      doc.setTextColor(0, 0, 0);

      // Units table
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

      // Enhancements section
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

      // Totals line
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 120;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Total: ${grandTotal}pts${list.points_limit ? ` / ${list.points_limit}pts` : ""}`,
        20,
        finalY + 10,
      );

      // Footer — "Generated by HobbyForge"
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(153, 153, 153);
      doc.text("Generated by HobbyForge", pageWidth - 20, pageHeight - 10, { align: "right" });

      // Write via Rust command (Pitfall 4: never call doc.save())
      const buffer = doc.output("arraybuffer");
      await invoke("write_bytes_to_path", {
        destination,
        bytes: Array.from(new Uint8Array(buffer)),
      });
      toast.success("List saved as PDF");
    } catch (err) {
      console.error("[ArmyListDetailSheet] PDF export failed:", err);
      toast.error("Failed to generate PDF");
    }
  }, [list, units, listEnhancements, faction]);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        // Pitfall 6 — fresh mount when switching lists
        key={list?.id ?? "none-detail"}
        className="overflow-y-auto sm:max-w-[900px]"
      >
        {list && (
          <>
            <SheetHeader>
              <SheetTitle>{list.name}</SheetTitle>
              <SheetDescription>
                {faction ? (
                  <Badge
                    style={faction.color_theme ? { backgroundColor: faction.color_theme } : undefined}
                    className={faction.color_theme ? "border-transparent text-white" : ""}
                  >
                    {faction.name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">No faction</span>
                )}
              </SheetDescription>
            </SheetHeader>

            <ArmyListSummaryBar units={units ?? []} pointsLimit={list.points_limit} freshness={freshness} enhancements={listEnhancements ?? []} />

            <Separator className="my-2" />

            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-semibold">Units</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAddUnit}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Unit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onBrowseDatasheets}
                >
                  <BookOpen className="mr-2 h-4 w-4" /> Browse Datasheets
                </Button>
              </div>
            </div>

            {isLoading && (
              <div className="flex flex-col gap-2 px-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            )}

            {!isLoading && (units?.length ?? 0) === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No units yet — add some.
              </p>
            )}

            {!isLoading && (units?.length ?? 0) > 0 && (
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
                    return (
                      <Fragment key={category}>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableCell colSpan={2} className="py-1.5">
                            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                              {category}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">
                              ({catUnits.length})
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                              {catTotal}pts
                            </span>
                          </TableCell>
                          <TableCell colSpan={2} className="py-1.5" />
                        </TableRow>
                        {catUnits.map(({ unit: alu, isIndentedLeader }) => (
                          <ArmyListUnitRow
                            key={alu.id}
                            unit={alu}
                            totalPoints={totalPoints}
                            pointsLimit={list.points_limit}
                            freshness={freshness}
                            onRemove={() => handleRemoveUnit(alu.id)}
                            onConfigure={() => onConfigureUnit(alu.id)}
                            onEnhance={() => onEnhanceUnit(alu.id)}
                            onAttachLeader={() => onAttachLeader(alu.id)}
                            onToggleWarlord={() => {}}
                            enhancementName={(listEnhancements ?? []).find((le) => le.army_list_unit_id === alu.id)?.enhancement_name}
                            isIndentedLeader={isIndentedLeader}
                            leaderName={leaderNameMap.get(alu.id)}
                            leaderTargets={leaderTargets ?? []}
                          />
                        ))}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            <Separator className="my-4" />

            <div className="flex flex-col gap-3 px-4 py-2">
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

            <div className="flex items-center gap-2 px-4 py-1">
              <ExportDropdown
                onCopyToClipboard={handleCopyToClipboard}
                onPrint={onPrintPreview}
                onSaveJson={handleSaveJson}
                onSavePdf={handleSavePdf}
              />
              <Button variant="outline" size="sm" onClick={onOpenSnapshots}>
                <History className="mr-2 h-4 w-4" />
                Snapshots
              </Button>
            </div>

            <Separator className="my-4" />

            <div className="flex flex-col gap-2 px-4">
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

            <SheetFooter className="mt-6 gap-2 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate({ to: "/game-day/$listId", params: { listId: String(list.id) } });
                }}
              >
                <Swords className="mr-2 h-4 w-4" />
                Game Day
              </Button>
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(list)}
              >
                Delete List
              </Button>
              <Button variant="outline" onClick={() => onEdit(list)}>
                Edit List
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
