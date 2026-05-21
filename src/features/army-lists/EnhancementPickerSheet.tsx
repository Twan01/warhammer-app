import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
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
import { getEnhancementsByFaction } from "@/db/queries/bsdataExtended";
import type { SyncedEnhancementRow } from "@/db/queries/bsdataExtended";
import { useEnhancementsByList, useAddEnhancement, useRemoveEnhancement } from "@/hooks/useArmyLists";
import { useUnitKeywords } from "@/hooks/useUnitKeywords";
import type { ArmyList, ArmyListUnitRow as ArmyListUnitRowType } from "@/types/armyList";

interface EnhancementPickerSheetProps {
  open: boolean;
  unit: ArmyListUnitRowType | null;
  list: ArmyList | null;
  onClose: () => void;
}

/**
 * Phase 91 — Sibling-portal sheet for browsing and assigning detachment enhancements
 * to a character unit in an army list.
 *
 * Preventive validation (ENH-02):
 * - Max 3 enhancements per army list
 * - No duplicate enhancement names
 * - Epic Heroes cannot receive enhancements
 *
 * Architecture: follows the LoadoutBuilderSheet sibling portal pattern.
 * State lives in ArmyListsPage; this Sheet is rendered as a sibling.
 */
export function EnhancementPickerSheet({ open, unit, list, onClose }: EnhancementPickerSheetProps) {
  // Pitfall 1: faction_id must be STRING for getEnhancementsByFaction (TEXT column)
  const factionIdStr = unit?.faction_id != null
    ? String(unit.faction_id)
    : list?.faction_id != null
      ? String(list.faction_id)
      : null;

  // Fetch all faction enhancements from synced rules data
  const { data: factionEnhancements = [] } = useQuery<SyncedEnhancementRow[]>({
    queryKey: ["enhancements-by-faction", factionIdStr],
    queryFn: () => getEnhancementsByFaction(factionIdStr!),
    enabled: !!factionIdStr,
    staleTime: 5 * 60 * 1000,
  });

  // Get enhancements already assigned in this list
  const { data: listEnhancements = [] } = useEnhancementsByList(list?.id);

  // Secondary guard: check if unit is an Epic Hero
  const { data: keywords } = useUnitKeywords(unit?.unit_name);

  // Filter to current detachment only
  const detachmentEnhancements = useMemo(() => {
    if (!list?.detachment_name) return [];
    return factionEnhancements.filter(
      (e) => e.detachment_name.toLowerCase() === list.detachment_name!.toLowerCase(),
    );
  }, [factionEnhancements, list?.detachment_name]);

  const addEnhancement = useAddEnhancement();
  const removeEnhancement = useRemoveEnhancement();

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
                <Sparkles className="h-4 w-4" />
                {unit.unit_name} — Enhancements
              </SheetTitle>
              <SheetDescription>
                {list?.detachment_name
                  ? `${list.detachment_name} detachment enhancements`
                  : "No detachment selected"}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4 py-4">
              {/* No faction guard */}
              {!factionIdStr && (
                <p className="text-sm text-muted-foreground">
                  No faction selected for this list.
                </p>
              )}

              {/* No detachment guard */}
              {factionIdStr && !list?.detachment_name && (
                <p className="text-sm text-muted-foreground">
                  Select a detachment first to view enhancements.
                </p>
              )}

              {/* Has detachment but no enhancements */}
              {factionIdStr && list?.detachment_name && detachmentEnhancements.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No enhancements available for this detachment.
                </p>
              )}

              {/* Enhancement count */}
              {factionIdStr && list?.detachment_name && detachmentEnhancements.length > 0 && (
                <>
                  <p className="text-sm text-muted-foreground">
                    {listEnhancements.length} / 3 enhancements assigned
                  </p>

                  {/* Enhancement list */}
                  <div className="flex flex-col gap-3">
                    {detachmentEnhancements.map((enhancement) => {
                      const existingOnThisUnit = listEnhancements.find(
                        (le) =>
                          le.enhancement_name === enhancement.name &&
                          le.army_list_unit_id === unit.id,
                      );
                      const existingOnOtherUnit = listEnhancements.find(
                        (le) =>
                          le.enhancement_name === enhancement.name &&
                          le.army_list_unit_id !== unit.id,
                      );
                      const isDuplicate = listEnhancements.some(
                        (le) => le.enhancement_name === enhancement.name,
                      );
                      const isMaxed = listEnhancements.length >= 3;
                      const isEpicHero = keywords?.isEpicHero ?? false;

                      // Determine disable reason (first match wins)
                      let disableReason: string | null = null;
                      if (!existingOnThisUnit) {
                        if (isMaxed) disableReason = "Max 3 enhancements per army";
                        else if (isDuplicate) disableReason = "Enhancement already assigned";
                        else if (isEpicHero) disableReason = "Epic Heroes cannot receive enhancements";
                      }

                      return (
                        <div
                          key={enhancement.name}
                          className="flex items-center justify-between gap-2 rounded-md border p-3"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">{enhancement.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{enhancement.points} pts</Badge>
                              {existingOnOtherUnit && (
                                <Badge variant="outline" className="text-xs">
                                  Assigned to another unit
                                </Badge>
                              )}
                              {existingOnThisUnit && (
                                <Badge variant="default" className="text-xs">
                                  Assigned to this unit
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {existingOnThisUnit ? (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={removeEnhancement.isPending}
                                onClick={() => {
                                  removeEnhancement.mutate(
                                    { enhancement_id: existingOnThisUnit.id, list_id: list!.id },
                                    { onError: () => toast.error("Failed to remove enhancement. Please try again.") },
                                  );
                                }}
                              >
                                Remove
                              </Button>
                            ) : disableReason ? (
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
                                      Assign
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{disableReason}</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={addEnhancement.isPending}
                                onClick={() => {
                                  addEnhancement.mutate(
                                    {
                                      list_id: list!.id,
                                      army_list_unit_id: unit.id,
                                      enhancement_name: enhancement.name,
                                      enhancement_points: enhancement.points,
                                    },
                                    { onError: () => toast.error("Failed to assign enhancement. Please try again.") },
                                  );
                                }}
                              >
                                Assign
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
