/**
 * Phase 90 — LoadoutBuilderSheet (DL-01, DL-02).
 *
 * Dedicated configuration panel for a single army list unit:
 *   Section 1: Model count tier selector (DL-01)
 *   Section 2: Wargear picker (count-based weapon selection, persisted to
 *              army_list_unit_wargear) + datasheet reference (DL-02)
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
import { Minus, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  useUnitWargear,
  useSetUnitWargearQuantity,
  useClearUnitWargear,
} from "@/hooks/useArmyLists";
import { useTiersByUdbUnitId } from "@/hooks/useLoadoutOptions";
import { useUdbUnitDetail } from "@/hooks/useUnitDatabase";
import { PlaybookDatasheet } from "@/features/units/PlaybookDatasheet";
import { resolveUnitPoints } from "@/lib/resolveUnitPoints";
import { PointsSourceChip } from "./PointsSourceChip";
import type { ArmyListUnitRow } from "@/types/armyList";
import type { UdbWeapon } from "@/db/queries/unitDatabase";

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

  // Model-count guidance for the wargear picker: prefer the chosen tier, else
  // the largest available tier. Used to cap/steer quantities (not enforced —
  // no constraint data exists yet).
  const maxModels = useMemo(() => {
    if (unit?.selected_model_count != null) return unit.selected_model_count;
    const tierMax = (tiers ?? []).reduce((m, t) => Math.max(m, t.model_count), 0);
    return tierMax > 0 ? tierMax : undefined;
  }, [unit?.selected_model_count, tiers]);

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

            {/* Section 2: Wargear picker + datasheet reference (DL-02) */}
            <div className="flex flex-col gap-4 px-4 py-3">
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
                <>
                  <WargearPicker
                    armyListUnitId={unit.id}
                    weapons={datasheet?.weapons ?? []}
                    maxModels={maxModels}
                  />

                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Datasheet reference
                    </span>
                    <PlaybookDatasheet datasheet={datasheet} />
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

// ---------------------------------------------------------------------------
// WargearPicker — count-based weapon selection (MVP, migration 047)
// ---------------------------------------------------------------------------
//
// Lists each distinct weapon the unit can field with a quantity stepper.
// Selections persist to army_list_unit_wargear. No "1 per N models" / "Sergeant
// only" enforcement — that constraint data does not exist in the Wahapedia
// source (deferred to a future constraint-aware picker). maxModels is guidance
// only: it caps the stepper to a sensible ceiling, not a real rule.

function WargearPicker({
  armyListUnitId,
  weapons,
  maxModels,
}: {
  armyListUnitId: number;
  weapons: UdbWeapon[];
  maxModels: number | undefined;
}) {
  const { data: selections } = useUnitWargear(armyListUnitId);
  const setQty = useSetUnitWargearQuantity();
  const clearAll = useClearUnitWargear();

  // Distinct selectable weapons (dedup multi-profile weapons by name),
  // ordered Ranged → Melee → other, then alphabetically.
  const selectable = useMemo(() => {
    const seen = new Map<string, { name: string; category: string | null }>();
    for (const w of weapons) {
      if (!seen.has(w.name)) seen.set(w.name, { name: w.name, category: w.category });
    }
    const rank = (c: string | null) =>
      c === "Ranged" ? 0 : c === "Melee" ? 1 : 2;
    return [...seen.values()].sort((a, b) => {
      const r = rank(a.category) - rank(b.category);
      return r !== 0 ? r : a.name.localeCompare(b.name);
    });
  }, [weapons]);

  const qtyByName = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of selections ?? []) m.set(s.weapon_name, s.quantity);
    return m;
  }, [selections]);

  const chosen = (selections ?? []).filter((s) => s.quantity > 0);
  // Stepper ceiling: the model count when known, otherwise an arbitrary high cap.
  const cap = maxModels && maxModels > 0 ? maxModels : 99;

  function change(name: string, next: number) {
    setQty.mutate({
      army_list_unit_id: armyListUnitId,
      weapon_name: name,
      quantity: Math.max(0, Math.min(cap, next)),
    });
  }

  if (selectable.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No selectable weapons for this unit.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Loadout
        </span>
        {chosen.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => clearAll.mutate(armyListUnitId)}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Selected summary */}
      <p className="text-sm">
        {chosen.length === 0 ? (
          <span className="text-muted-foreground">No weapons selected yet.</span>
        ) : (
          chosen.map((s) => `${s.quantity}× ${s.weapon_name}`).join(", ")
        )}
      </p>

      {maxModels != null && (
        <p className="text-xs text-muted-foreground">
          {maxModels} model{maxModels === 1 ? "" : "s"} in this unit — quantities
          are not rule-checked, pick what your models are equipped with.
        </p>
      )}

      {/* Per-weapon steppers */}
      <ul className="flex flex-col divide-y rounded-md border">
        {selectable.map((w) => {
          const qty = qtyByName.get(w.name) ?? 0;
          return (
            <li
              key={w.name}
              className="flex items-center justify-between gap-2 px-3 py-2"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate text-sm">{w.name}</span>
                {w.category && (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {w.category}
                  </Badge>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={`Decrease ${w.name}`}
                  disabled={qty <= 0}
                  onClick={() => change(w.name, qty - 1)}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-6 text-center text-sm tabular-nums">{qty}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={`Increase ${w.name}`}
                  disabled={qty >= cap}
                  onClick={() => change(w.name, qty + 1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
