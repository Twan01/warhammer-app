/**
 * Phase 90 — LoadoutBuilderSheet (DL-01, DL-02).
 *
 * Dedicated configuration panel for a single army list unit:
 *   Section 1: Model count tier selector (DL-01)
 *   Section 2: Datasheet (weapons + abilities) display (DL-02, read-only)
 *
 * Opened as a sibling portal from ArmyListsPage (D-01, Pitfall 5).
 * Never nested inside ArmyListDetailPage portals.
 *
 * Wargear/datasheet data is sourced from the canonical unit database
 * (udb_unit_weapons / udb_unit_abilities) via units.udb_unit_id — the same
 * FK-based source the tier selector uses (Phase 106). The legacy
 * synced_loadout_options table is stale (pre-Wahapedia) and was never matched
 * by the current dataset, which left this section permanently empty.
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
import { useTiersByUdbUnitId } from "@/hooks/useLoadoutOptions";
import { useUdbUnitDetail } from "@/hooks/useUnitDatabase";
import { PlaybookDatasheet } from "@/features/units/PlaybookDatasheet";
import { resolveUnitPoints } from "@/lib/resolveUnitPoints";
import { PointsSourceChip } from "./PointsSourceChip";
import type { ArmyListUnitRow } from "@/types/armyList";

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
// Component
// ---------------------------------------------------------------------------

export function LoadoutBuilderSheet({
  open,
  unit,
  listId,
  onClose,
}: LoadoutBuilderSheetProps) {
  const udbUnitId = unit?.udb_unit_id ?? undefined;

  // Data hooks — both tiers and datasheet use FK-based lookup via udb_unit_id.
  // Tiers: udb_unit_points (Phase 106). Datasheet/wargear: udb_unit_weapons +
  // udb_unit_abilities via getUdbUnitDetail. Ghost/planned units (no
  // udb_unit_id) resolve to no datasheet, handled below.
  const { data: tiers } = useTiersByUdbUnitId(udbUnitId);
  const { data: datasheet } = useUdbUnitDetail(unit?.udb_unit_id ?? null);
  const setModelCount = useSetSelectedModelCount();
  const clearModelCount = useClearSelectedModelCount();

  // Points resolution for description
  const resolved = useMemo(() => {
    if (!unit) return { points: 0, source: "unknown" as const };
    return resolveUnitPoints({
      points_override: unit.points_override,
      tier_points: unit.tier_points,
      udb_base_points: unit.udb_base_points,
      override_points: unit.override_points,
      unit_points: unit.unit_points,
    });
  }, [unit?.points_override, unit?.tier_points, unit?.udb_base_points, unit?.override_points, unit?.unit_points]);

  const hasDatasheet =
    (datasheet?.weapons.length ?? 0) > 0 ||
    (datasheet?.abilities.length ?? 0) > 0;

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

                </div>
              )}
            </div>

            <Separator />

            {/* Section 2: Wargear & Datasheet (DL-02) */}
            <div className="flex flex-col gap-3 px-4 py-3">
              <span className="text-sm font-semibold">Wargear &amp; Abilities</span>

              {unit.udb_unit_id === null ? (
                <p className="text-sm text-muted-foreground">
                  This unit is not linked to the unit database, so no datasheet
                  is available.
                </p>
              ) : !hasDatasheet ? (
                <p className="text-sm text-muted-foreground">
                  No datasheet data available for this unit.
                </p>
              ) : (
                <PlaybookDatasheet datasheet={datasheet} />
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
