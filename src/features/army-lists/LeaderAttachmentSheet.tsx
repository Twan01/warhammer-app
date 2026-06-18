import { useMemo } from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useLeaderTargets } from "@/hooks/useLeaderTargets";
import { useSetLeaderAttachment, useClearLeaderAttachment } from "@/hooks/useArmyLists";
import type { ArmyList, ArmyListUnitRow as ArmyListUnitRowType } from "@/types/armyList";

interface LeaderAttachmentSheetProps {
  open: boolean;
  unit: ArmyListUnitRowType | null;
  list: ArmyList | null;
  units: ArmyListUnitRowType[];
  onClose: () => void;
}

/**
 * Phase 137 — Leader Attachment Sheet repoint (PLAY-03, D-08, D-09).
 *
 * Sibling-portal sheet for browsing and attaching/detaching leaders
 * to valid target units in an army list.
 *
 * Canonical validation: uses id-keyed udb_leader_targets pairs (not name
 * matching) to determine which units are valid targets. Called ONCE at
 * sheet level — never per-row (D-07 / Pitfall 6).
 *
 * NULL fallback (D-09 / Pitfall 5): if a leader unit reaches this sheet with a
 * NULL udb_unit_id, validTargetIds is set to null (PERMISSIVE sentinel — shows
 * ALL units as selectable) rather than an empty Set ("canonically no valid
 * targets"). Never confuse the two: null = "no canonical data, don't restrict",
 * empty Set = "canonically zero valid targets".
 *
 * Scope (accepted UAT decision, Phase 137 item 3): leader attachment is
 * canonical-only by design. The "Attach Leader" affordance (isLeader in
 * ArmyListUnitRow) is derived from canonical udb_leader_targets pairs, so a
 * ghost/manual unit with no udb_unit_id does not surface an Attach button and
 * does not reach this sheet — both the leader and its target must be linked to
 * the canonical database. The permissive sentinel above is a defensive guard
 * for the rare case a canonical leader row carries a NULL udb_unit_id, not a
 * path for ghost leaders.
 *
 * Architecture: follows the EnhancementPickerSheet sibling portal pattern.
 * State lives in ArmyListsPage; this Sheet is rendered as a sibling.
 */
export function LeaderAttachmentSheet({ open, unit, list, units, onClose }: LeaderAttachmentSheetProps) {
  // Batch pair data for entire list (replaces faction-based name-match).
  // Called ONCE at sheet level — never per-row (D-07 / Pitfall 6).
  const { data: leaderTargetPairs = [] } = useLeaderTargets(list?.id ?? null);

  const setLeaderAttachment = useSetLeaderAttachment();
  const clearLeaderAttachment = useClearLeaderAttachment();

  // Determine if this leader has canonical data (NULL udb_unit_id = permissive)
  const leaderHasCanonicalData = unit?.udb_unit_id != null;

  // Build valid-target Set for this leader.
  // null = permissive sentinel (D-09 / Pitfall 5): show ALL units.
  // empty Set = canonically no valid targets (different meaning!).
  const validTargetIds = useMemo(() => {
    if (!unit || !leaderHasCanonicalData) return null;
    return new Set(
      leaderTargetPairs
        .filter((p) => p.leader_alu_id === unit.id)
        .map((p) => p.target_alu_id),
    );
  }, [unit, leaderHasCanonicalData, leaderTargetPairs]);

  // Filter list units to valid targets.
  // null validTargetIds = permissive: return ALL units (D-09).
  const validTargetUnits = useMemo(() => {
    if (validTargetIds === null) return units;
    return units.filter((u) => validTargetIds.has(u.id));
  }, [units, validTargetIds]);

  // Current attachment: check if this leader is already attached
  const currentTarget = useMemo(() => {
    if (!unit || unit.leader_attached_to_id == null) return null;
    return units.find((u) => u.id === unit.leader_attached_to_id) ?? null;
  }, [unit, units]);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        className="overflow-y-auto sm:max-w-[480px]"
      >
        {unit && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                {unit.unit_name} — Leader Attachment
              </SheetTitle>
              <SheetDescription>
                Attach this leader to a valid target unit
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4 py-4">
              {/* Advisory: no canonical data for this leader (D-09 permissive fallback) */}
              {!leaderHasCanonicalData && (
                <p className="text-sm text-muted-foreground">
                  No canonical attachment data — validation unavailable for this unit. All units in the list are shown as selectable targets.
                </p>
              )}

              {/* Current attachment banner */}
              {currentTarget && (
                <div className="flex items-center justify-between gap-2 rounded-md border bg-secondary p-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Currently attached to</span>
                    <span className="text-sm font-medium">{currentTarget.unit_name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={clearLeaderAttachment.isPending}
                    onClick={() => {
                      if (!list) return;
                      clearLeaderAttachment.mutate(
                        { army_list_unit_id: unit.id, list_id: list.id },
                        {
                          onSuccess: () => toast.success("Leader detached."),
                          onError: () => toast.error("Failed to detach leader. Please try again."),
                        },
                      );
                    }}
                  >
                    Detach Leader
                  </Button>
                </div>
              )}

              {/* Valid targets list */}
              {validTargetUnits.length > 0 && (
                <div className="flex flex-col gap-3">
                  {validTargetUnits.map((target) => {
                    // Check if this target already has a different leader attached
                    const existingLeader = units.find(
                      (u) =>
                        u.leader_attached_to_id === target.id &&
                        u.id !== unit.id,
                    );
                    const isCurrentTarget = currentTarget?.id === target.id;

                    return (
                      <div
                        key={target.id}
                        className="flex items-center justify-between gap-2 rounded-md border p-3"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{target.unit_name}</span>
                          <Badge variant="secondary">{target.effective_points} pts</Badge>
                        </div>

                        <div className="flex items-center gap-1">
                          {isCurrentTarget ? (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={clearLeaderAttachment.isPending}
                              onClick={() => {
                                if (!list) return;
                                clearLeaderAttachment.mutate(
                                  { army_list_unit_id: unit.id, list_id: list.id },
                                  {
                                    onSuccess: () => toast.success("Leader detached."),
                                    onError: () => toast.error("Failed to detach leader. Please try again."),
                                  },
                                );
                              }}
                            >
                              Detach Leader
                            </Button>
                          ) : existingLeader ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {/* Wrap disabled button in span for tooltip */}
                                <span className="inline-flex">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    disabled
                                  >
                                    Attach Leader
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Already led by {existingLeader.unit_name}</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={setLeaderAttachment.isPending}
                              onClick={() => {
                                if (!list) return;
                                setLeaderAttachment.mutate(
                                  { army_list_unit_id: unit.id, target_id: target.id, list_id: list.id },
                                  {
                                    onSuccess: () => toast.success("Leader attached."),
                                    onError: () => toast.error("Failed to attach leader. Please try again."),
                                  },
                                );
                              }}
                            >
                              Attach Leader
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty state: canonical data found but no valid targets in this list */}
              {leaderHasCanonicalData && validTargetUnits.length === 0 && (
                <div className="flex flex-col gap-2 py-4 text-center">
                  <p className="text-sm font-medium">No valid targets in this list</p>
                  <p className="text-sm text-muted-foreground">
                    Add a unit that this leader can be attached to.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
