/**
 * Phase 90 — LoadoutBuilderSheet (DL-01, DL-02).
 *
 * Dedicated configuration panel for a single army list unit:
 *   Section 1: Model count tier selector (DL-01)
 *   Section 2: Wargear options display (DL-02, read-only)
 *
 * Opened as a sibling portal from ArmyListsPage (D-01, Pitfall 5).
 * Never nested inside ArmyListDetailSheet.
 */
import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSetSelectedModelCount,
  useClearSelectedModelCount,
} from "@/hooks/useArmyLists";
import {
  useLoadoutOptionsForUnit,
  useTiersByUnitName,
} from "@/hooks/useLoadoutOptions";
import { resolveUnitPoints } from "@/lib/resolveUnitPoints";
import { PointsSourceChip } from "./PointsSourceChip";
import type { ArmyListUnitRow } from "@/types/armyList";
import type { SyncedLoadoutOptionRow } from "@/db/queries/bsdataExtended";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LoadoutBuilderSheetProps {
  open: boolean;
  unit: ArmyListUnitRow | null;
  listId: number | null;
  listFactionId: number | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByGroupName(options: SyncedLoadoutOptionRow[]) {
  const groups = new Map<string, SyncedLoadoutOptionRow[]>();
  for (const opt of options) {
    const group = groups.get(opt.group_name) ?? [];
    group.push(opt);
    groups.set(opt.group_name, group);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LoadoutBuilderSheet({
  open,
  unit,
  listId,
  listFactionId,
  onClose,
}: LoadoutBuilderSheetProps) {
  // Derive unit name (always available on ArmyListUnitRow via COALESCE)
  const unitName = unit?.unit_name;

  // Pitfall 1 — faction_id must be string for synced table queries
  const factionIdStr = unit?.faction_id !== null && unit?.faction_id !== undefined
    ? String(unit.faction_id)
    : listFactionId !== null && listFactionId !== undefined
      ? String(listFactionId)
      : null;

  // Data hooks
  const { data: tiers } = useTiersByUnitName(unitName, factionIdStr);
  const { data: wargearOptions } = useLoadoutOptionsForUnit(unitName, factionIdStr);
  const setModelCount = useSetSelectedModelCount();
  const clearModelCount = useClearSelectedModelCount();

  // Points resolution for description
  const resolved = useMemo(() => {
    if (!unit) return { points: 0, source: "unknown" as const };
    return resolveUnitPoints({
      points_override: unit.points_override,
      tier_points: unit.tier_points,
      synced_points: unit.synced_points,
      override_points: unit.override_points,
      unit_points: unit.unit_points,
    });
  }, [unit?.points_override, unit?.tier_points, unit?.synced_points, unit?.override_points, unit?.unit_points]);

  // Wargear grouping
  const wargearGroups = useMemo(
    () => groupByGroupName(wargearOptions ?? []),
    [wargearOptions],
  );

  // Delta preview: compute difference between current tier and selected tier
  const currentTierPoints = unit?.tier_points ?? null;
  function computeDelta(selectedValue: string): number {
    if (selectedValue === "__default__" || !tiers) return 0;
    const count = Number(selectedValue);
    const selectedTier = tiers.find((t) => t.model_count === count);
    if (!selectedTier || currentTierPoints === null) return 0;
    return selectedTier.points - currentTierPoints;
  }

  function handleTierChange(value: string) {
    if (!unit || !listId) return;
    if (value === "__default__") {
      clearModelCount.mutate({ army_list_unit_id: unit.id, list_id: listId });
    } else {
      setModelCount.mutate({
        army_list_unit_id: unit.id,
        count: Number(value),
        list_id: listId,
      });
    }
  }

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
                {unit.unit_name}
                {unit.unit_id === null && (
                  <Badge variant="outline">Planned</Badge>
                )}
              </SheetTitle>
              <SheetDescription>
                <PointsSourceChip points={resolved.points} source={resolved.source} />
              </SheetDescription>
            </SheetHeader>

            {/* Section 1: Model Count Tier Selector (DL-01) */}
            <div className="flex flex-col gap-3 px-4 py-3">
              <label className="text-sm font-semibold">Model Count</label>

              {/* Pitfall 6 — points_override warning */}
              {unit.points_override !== null && (
                <p className="text-xs text-muted-foreground">
                  Points manually overridden — tier selection won't affect
                  displayed points until override is cleared.
                </p>
              )}

              {(tiers ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tier data available
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <Select
                    value={
                      unit.selected_model_count !== null
                        ? String(unit.selected_model_count)
                        : "__default__"
                    }
                    onValueChange={handleTierChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Default</SelectItem>
                      {(tiers ?? []).map((t) => (
                        <SelectItem
                          key={t.model_count}
                          value={String(t.model_count)}
                        >
                          {t.model_count} models — {t.points}pts
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Delta badge: shows when user has selected a tier and a new
                      selection would change the points */}
                  {unit.selected_model_count !== null &&
                    currentTierPoints !== null &&
                    (() => {
                      const delta = computeDelta(String(unit.selected_model_count));
                      return delta !== 0 ? (
                        <Badge
                          variant="outline"
                          className={
                            delta > 0
                              ? "text-destructive border-destructive"
                              : "text-green-600 border-green-600"
                          }
                        >
                          {delta > 0 ? `+${delta}` : `${delta}`}
                        </Badge>
                      ) : null;
                    })()}
                </div>
              )}
            </div>

            <Separator />

            {/* Section 2: Wargear Options (DL-02) */}
            <div className="flex flex-col gap-3 px-4 py-3">
              <span className="text-sm font-semibold">Wargear Options</span>

              {wargearGroups.size === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No wargear data available
                </p>
              ) : (
                Array.from(wargearGroups.entries()).map(([groupName, options]) => (
                  <div key={groupName}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      {groupName}
                    </p>
                    <ul className="space-y-1">
                      {options.map((opt) => (
                        <li
                          key={`${opt.group_name}-${opt.option_name}`}
                          className="flex items-center gap-2 text-sm"
                        >
                          {opt.option_name}
                          {opt.is_default === 1 && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                          {opt.is_exclusive === 1 && (
                            <Badge variant="outline">Exclusive</Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
