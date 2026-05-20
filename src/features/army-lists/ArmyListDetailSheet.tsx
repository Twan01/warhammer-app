import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Swords } from "lucide-react";
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
  Table, TableHeader, TableRow, TableHead, TableBody,
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
} from "@/hooks/useArmyLists";
import { useWahapediaFactionId, useRulesSyncMeta } from "@/hooks/useDatasheet";
import { useFactions } from "@/hooks/useFactions";
import type { ArmyList } from "@/types/armyList";
import { ArmyListSummaryBar } from "./ArmyListSummaryBar";
import { ArmyListUnitRow } from "./ArmyListUnitRow";
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
}

export function ArmyListDetailSheet({
  open, list, onClose, onEdit, onDelete, onAddUnit, onConfigureUnit,
}: ArmyListDetailSheetProps) {
  const { data: units, isLoading } = useArmyListWithUnits(list?.id);
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

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        // Pitfall 6 — fresh mount when switching lists
        key={list?.id ?? "none-detail"}
        className="overflow-y-auto sm:max-w-[600px]"
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

            <ArmyListSummaryBar units={units ?? []} pointsLimit={list.points_limit} freshness={freshness} />

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

            <Separator className="my-2" />

            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-semibold">Units</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddUnit}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Unit
              </Button>
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
                  {(units ?? []).map((alu) => (
                    <ArmyListUnitRow
                      key={alu.id}
                      unit={alu}
                      totalPoints={totalPoints}
                      pointsLimit={list.points_limit}
                      freshness={freshness}
                      onRemove={() => handleRemoveUnit(alu.id)}
                      onConfigure={() => onConfigureUnit(alu.id)}
                    />
                  ))}
                </TableBody>
              </Table>
            )}

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
