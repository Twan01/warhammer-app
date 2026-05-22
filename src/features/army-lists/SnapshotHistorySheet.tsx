/**
 * Phase 95 — Snapshot History Sheet (SNP-01..04, D-13..D-15).
 *
 * Sibling portal at ArmyListsPage level. Provides:
 * - Save named snapshot (with default timestamp label)
 * - Chronological list of snapshots with actions
 * - Compare selection (two-click flow)
 * - Restore with confirmation + auto-save safety net
 * - Delete with undo toast
 */

import { useState, useCallback } from "react";
import { Save, GitCompareArrows, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useSnapshotsByList,
  useCreateSnapshot,
  useDeleteSnapshot,
  useRestoreSnapshot,
} from "@/hooks/useArmyListSnapshots";
import { getSnapshotData } from "@/db/queries/armyListSnapshots";
import {
  formatArmyListForExport,
  buildJsonFormat,
} from "@/lib/exportArmyList";
import type {
  ArmyList,
  ArmyListUnitRow,
  ArmyListEnhancement,
  ArmyListSnapshot,
} from "@/types/armyList";

interface SnapshotHistorySheetProps {
  open: boolean;
  listId: number | null;
  list: ArmyList | null;
  units: ArmyListUnitRow[];
  enhancements: ArmyListEnhancement[];
  factionName: string | null;
  onClose: () => void;
  onCompare: (ids: [number, number], labels: [string, string]) => void;
}

function formatDefaultLabel(): string {
  const now = new Date();
  return `Snapshot — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + " at " + d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function SnapshotHistorySheet({
  open,
  listId,
  list,
  units,
  enhancements,
  factionName,
  onClose,
  onCompare,
}: SnapshotHistorySheetProps) {
  const [label, setLabel] = useState("");
  const [selectedCompareId, setSelectedCompareId] = useState<number | null>(null);
  const [restoreTargetId, setRestoreTargetId] = useState<number | null>(null);

  const { data: snapshots, isLoading } = useSnapshotsByList(listId ?? undefined);
  const createSnapshot = useCreateSnapshot();
  const deleteSnapshot = useDeleteSnapshot();
  const restoreSnapshot = useRestoreSnapshot();

  const handleSave = useCallback(() => {
    if (!list || listId === null) return;

    const snapshotLabel = label.trim() || formatDefaultLabel();
    const exportData = formatArmyListForExport(list, units, enhancements, factionName);
    const blob = buildJsonFormat(exportData);
    const totalPoints = exportData.totalPoints + exportData.enhancementTotal;

    createSnapshot.mutate(
      {
        list_id: listId,
        label: snapshotLabel,
        snapshot_data: blob,
        total_points: totalPoints,
      },
      {
        onSuccess: () => {
          toast.success("Snapshot saved.");
          setLabel("");
        },
        onError: () => {
          toast.error("Failed to save snapshot.");
        },
      },
    );
  }, [list, listId, label, units, enhancements, factionName, createSnapshot]);

  const handleCompareClick = useCallback(
    (snapshot: ArmyListSnapshot) => {
      if (selectedCompareId === null) {
        setSelectedCompareId(snapshot.id);
      } else if (selectedCompareId !== snapshot.id) {
        const firstSnapshot = (snapshots ?? []).find((s) => s.id === selectedCompareId);
        const firstLabel = firstSnapshot?.label ?? "Snapshot A";
        onCompare([selectedCompareId, snapshot.id], [firstLabel, snapshot.label]);
        setSelectedCompareId(null);
      }
    },
    [selectedCompareId, snapshots, onCompare],
  );

  const handleRestore = useCallback(
    (snapshot: ArmyListSnapshot) => {
      if (!list || listId === null) return;

      if (list.faction_id === null) {
        toast.error("Cannot restore: this list has no faction assigned. Please assign a faction first.");
        return;
      }

      restoreSnapshot.mutate(
        {
          snapshot_id: snapshot.id,
          list_id: listId,
          faction_id: list.faction_id,
        },
        {
          onSuccess: () => {
            toast.success(`List restored to '${snapshot.label}'.`);
            setRestoreTargetId(null);
          },
          onError: () => {
            toast.error("Something went wrong. Please try again.");
            setRestoreTargetId(null);
          },
        },
      );
    },
    [list, listId, restoreSnapshot],
  );

  const handleDelete = useCallback(
    async (snapshot: ArmyListSnapshot) => {
      if (listId === null) return;

      // Pre-fetch snapshot data for undo
      let savedData: string | null = null;
      try {
        savedData = await getSnapshotData(snapshot.id);
      } catch {
        // If we can't fetch the data, delete without undo
      }

      deleteSnapshot.mutate(
        { snapshotId: snapshot.id, list_id: listId },
        {
          onSuccess: () => {
            toast("Snapshot deleted.", {
              action: savedData
                ? {
                    label: "Undo",
                    onClick: () => {
                      createSnapshot.mutate({
                        list_id: listId,
                        label: snapshot.label,
                        snapshot_data: savedData!,
                        total_points: snapshot.total_points,
                      });
                    },
                  }
                : undefined,
            });
          },
          onError: () => {
            toast.error("Something went wrong. Please try again.");
          },
        },
      );
    },
    [listId, deleteSnapshot, createSnapshot],
  );

  const snapshotCount = snapshots?.length ?? 0;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { onClose(); setSelectedCompareId(null); setRestoreTargetId(null); } }}>
      <SheetContent side="right" className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Snapshot History</SheetTitle>
          <SheetDescription>{list?.name ?? ""}</SheetDescription>
        </SheetHeader>

        {/* Save section */}
        <div className="flex flex-col gap-2 px-4 py-3">
          <label className="text-sm text-muted-foreground">Save current state as snapshot</label>
          <div className="flex gap-2">
            <Input
              placeholder={formatDefaultLabel()}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
            <Button
              onClick={handleSave}
              disabled={createSnapshot.isPending || !list}
              size="sm"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Snapshot
            </Button>
          </div>
        </div>

        <Separator />

        {/* Snapshot list */}
        <ScrollArea className="flex-1 min-h-0">
          {isLoading && (
            <div className="flex flex-col gap-2 px-4 py-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          )}

          {!isLoading && snapshotCount === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-semibold text-muted-foreground">No snapshots yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Save the current state above to start tracking versions of this list.
              </p>
            </div>
          )}

          {!isLoading && snapshotCount > 0 && (
            <div className="flex flex-col">
              {(snapshots ?? []).map((snapshot) => {
                const isSelected = selectedCompareId === snapshot.id;
                const isRestoreTarget = restoreTargetId === snapshot.id;
                const isAutoSave = snapshot.label.startsWith("Auto-save");

                return (
                  <div
                    key={snapshot.id}
                    className={`flex items-start justify-between p-2 border-b border-border ${
                      isSelected ? "ring-1 ring-faction-accent rounded-sm" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isAutoSave && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">Auto-save</Badge>
                        )}
                        <span className="text-sm font-semibold truncate">{snapshot.label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(snapshot.created_at)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {snapshot.total_points} pts
                      </span>
                    </div>

                    {/* Restore confirmation inline */}
                    {isRestoreTarget ? (
                      <div className="flex flex-col gap-2 ml-2 shrink-0">
                        <p className="text-xs text-muted-foreground max-w-[200px]">
                          This will replace your current list with &apos;{snapshot.label}&apos;.
                          A safety snapshot of your current state will be saved automatically before restoring.
                        </p>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRestoreTargetId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={restoreSnapshot.isPending}
                            onClick={() => handleRestore(snapshot)}
                          >
                            Restore
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Compare snapshots"
                          title={
                            snapshotCount < 2
                              ? "Need at least 2 snapshots to compare"
                              : isSelected
                                ? "Selected — click another to compare"
                                : "Compare snapshots"
                          }
                          disabled={snapshotCount < 2}
                          onClick={() => handleCompareClick(snapshot)}
                        >
                          <GitCompareArrows className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Restore this snapshot"
                          title="Restore this snapshot"
                          onClick={() => setRestoreTargetId(snapshot.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Delete snapshot"
                          title="Delete snapshot"
                          onClick={() => handleDelete(snapshot)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
