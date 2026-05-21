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
 * Phase 92 -- Leader Attachment Sheet (LDR-01, LDR-02).
 *
 * Sibling-portal sheet for browsing and attaching/detaching leaders
 * to valid target units in an army list.
 *
 * Preventive validation (D-08): only valid pairings from synced_leader_targets
 * are offered as targets. Targets already led by another leader have their
 * Attach button disabled with tooltip (T-92-05).
 *
 * Architecture: follows the EnhancementPickerSheet sibling portal pattern.
 * State lives in ArmyListsPage; this Sheet is rendered as a sibling.
 */
export function LeaderAttachmentSheet({ open, unit, list, units, onClose }: LeaderAttachmentSheetProps) {
  // Pitfall 1: faction_id must be STRING for getLeaderTargetsByFaction (TEXT column)
  const factionIdStr = unit?.faction_id != null
    ? String(unit.faction_id)
    : list?.faction_id != null
      ? String(list.faction_id)
      : null;

  // Fetch all leader targets for this faction from synced rules data
  const { data: leaderTargets = [] } = useLeaderTargets(factionIdStr);

  const setLeaderAttachment = useSetLeaderAttachment();
  const clearLeaderAttachment = useClearLeaderAttachment();

  // Compute valid target names for this leader (case-insensitive match)
  const validTargetNames = useMemo(() => {
    if (!unit) return [];
    const leaderName = unit.unit_name.toLowerCase();
    return leaderTargets
      .filter((lt) => lt.leader_name.toLowerCase() === leaderName)
      .map((lt) => lt.target_name);
  }, [unit, leaderTargets]);

  // Filter list units to valid targets (case-insensitive name match)
  const validTargetUnits = useMemo(() => {
    const targetNamesLower = new Set(validTargetNames.map((n) => n.toLowerCase()));
    return units.filter((u) => targetNamesLower.has(u.unit_name.toLowerCase()));
  }, [units, validTargetNames]);

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
              {/* No faction guard */}
              {!factionIdStr && (
                <p className="text-sm text-muted-foreground">
                  No faction selected for this list.
                </p>
              )}

              {/* Current attachment banner (D-03) */}
              {factionIdStr && currentTarget && (
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
                      clearLeaderAttachment.mutate(
                        { army_list_unit_id: unit.id, list_id: list!.id },
                        { onError: () => toast.error("Failed to detach leader. Please try again.") },
                      );
                    }}
                  >
                    Detach Leader
                  </Button>
                </div>
              )}

              {/* Valid targets list */}
              {factionIdStr && validTargetUnits.length > 0 && (
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
                                clearLeaderAttachment.mutate(
                                  { army_list_unit_id: unit.id, list_id: list!.id },
                                  { onError: () => toast.error("Failed to detach leader. Please try again.") },
                                );
                              }}
                            >
                              Detach Leader
                            </Button>
                          ) : existingLeader ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {/* Pitfall 2: wrap disabled button in span for tooltip */}
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
                                setLeaderAttachment.mutate(
                                  { army_list_unit_id: unit.id, target_id: target.id, list_id: list!.id },
                                  { onError: () => toast.error("Failed to attach leader. Please try again.") },
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

              {/* Empty state: has faction but no valid targets in list */}
              {factionIdStr && validTargetUnits.length === 0 && (
                <div className="flex flex-col gap-2 py-4 text-center">
                  <p className="text-sm font-medium">No valid targets in this list</p>
                  {validTargetNames.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Add one of the following units to attach this leader: {validTargetNames.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
