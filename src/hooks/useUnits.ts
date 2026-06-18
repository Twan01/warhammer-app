import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUnits,
  getUnitsWithPoints,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
} from "@/db/queries/units";
import { getArmyListsByUnitId } from "@/db/queries/armyLists";
import type { CreateUnitInput, UpdateUnitInput } from "@/types/unit";

export const UNITS_KEY = ["units"] as const;
export const UNITS_ENRICHED_KEY = ["units", "enriched"] as const;
export const UNIT_KEY = (id: number) => ["units", id] as const;

export function useUnits() {
  return useQuery({ queryKey: UNITS_KEY, queryFn: getUnits });
}

/** Units with effective_points resolved from rules.db sync + manual override. */
export function useUnitsEnriched() {
  return useQuery({ queryKey: UNITS_ENRICHED_KEY, queryFn: getUnitsWithPoints });
}

export function useUnit(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? UNIT_KEY(id) : ["units", "disabled"],
    queryFn: () => (id !== undefined ? getUnitById(id) : Promise.resolve(null)),
    enabled: id !== undefined,
  });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateUnitInput>({
    mutationFn: createUnit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UNITS_KEY });
      qc.invalidateQueries({ queryKey: UNITS_ENRICHED_KEY });
      // DATA-09: forward-compatibility — invalidate dashboard-stats when unit data changes
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      // SPEND-03/04 (Pitfall 2): invalidate spending-stats so Spending page stays fresh
      qc.invalidateQueries({ queryKey: ["spending-stats"] });
      qc.invalidateQueries({ queryKey: ["hobby-analytics"] });
      // Phase 32: army readiness depends on unit points + painting status
      qc.invalidateQueries({ queryKey: ["army-readiness"] });
      // Phase 105 COL-04: refresh ownership badges (faction-scoped)
      qc.invalidateQueries({ queryKey: ["udb-ownership"] });
      // Phase 138-03 D-08: refresh faction-agnostic ownership (distinct key — NOT covered by prefix above)
      qc.invalidateQueries({ queryKey: ["udb-ownership-all"] });
    },
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateUnitInput>({
    mutationFn: updateUnit,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: UNITS_KEY });
      qc.invalidateQueries({ queryKey: UNITS_ENRICHED_KEY });
      qc.invalidateQueries({ queryKey: UNIT_KEY(variables.id) });
      // DATA-09: forward-compatibility — invalidate dashboard-stats when unit data changes
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      // SPEND-03/04 (Pitfall 2): invalidate spending-stats so Spending page stays fresh
      qc.invalidateQueries({ queryKey: ["spending-stats"] });
      qc.invalidateQueries({ queryKey: ["hobby-analytics"] });
      // PLAY-02: painting status changes feed into army list battle-ready points
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
      // Phase 35: tier confirm writes to units.points — army list COALESCE chain needs refresh
      qc.invalidateQueries({ queryKey: ["army-lists"] });
      // Phase 32: army readiness depends on unit points + painting status
      qc.invalidateQueries({ queryKey: ["army-readiness"] });
      // Phase 105 COL-04: refresh ownership badges (faction-scoped)
      qc.invalidateQueries({ queryKey: ["udb-ownership"] });
      // Phase 138-03 D-08: refresh faction-agnostic ownership (distinct key — NOT covered by prefix above)
      qc.invalidateQueries({ queryKey: ["udb-ownership-all"] });
    },
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteUnit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UNITS_KEY });
      qc.invalidateQueries({ queryKey: UNITS_ENRICHED_KEY });
      // DATA-09: forward-compatibility — invalidate dashboard-stats when unit data changes
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      // SPEND-03/04 (Pitfall 2): invalidate spending-stats so Spending page stays fresh
      qc.invalidateQueries({ queryKey: ["spending-stats"] });
      qc.invalidateQueries({ queryKey: ["hobby-analytics"] });
      // Phase 32: army readiness depends on unit points + painting status
      qc.invalidateQueries({ queryKey: ["army-readiness"] });
      // Phase 105 COL-04: refresh ownership badges (faction-scoped)
      qc.invalidateQueries({ queryKey: ["udb-ownership"] });
      // Phase 138-03 D-08: refresh faction-agnostic ownership (distinct key — NOT covered by prefix above)
      qc.invalidateQueries({ queryKey: ["udb-ownership-all"] });
    },
    // FK errors (unit in army_list_units) reject — handled by component try/catch with toast
  });
}

// HON-10: Named hook for army lists that contain a given unit.
// Used by UnitDeleteDialog to show a membership warning before deleting.
export const UNIT_ARMY_LISTS_KEY = (unitId: number | null) =>
  ["unit-army-lists", unitId] as const;

export function useUnitArmyLists(unitId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: unitId !== null ? UNIT_ARMY_LISTS_KEY(unitId) : ["unit-army-lists", "disabled"],
    queryFn: () => getArmyListsByUnitId(unitId!),
    enabled: unitId !== null && enabled,
  });
}
