import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUnitLoadouts,
  createLoadout,
  deleteLoadout,
  activateLoadout,
  addWargearToLoadout,
  removeWargearFromLoadout,
} from "@/db/queries/unitLoadouts";
import type { CreateLoadoutInput, AddWargearToLoadoutInput } from "@/types/unitLoadout";

/**
 * Phase 24 — React Query hooks for unit loadouts + wargear.
 * Follows useStrategyNote per-unit pattern.
 *
 * activateLoadout also invalidates ["army-lists"] because the active loadout
 * name is displayed in ArmyListUnitRow.
 */

export const UNIT_LOADOUTS_KEY = (unitId: number) => ["unit-loadouts", unitId] as const;

export function useUnitLoadouts(unitId: number | undefined) {
  return useQuery({
    queryKey: unitId !== undefined ? UNIT_LOADOUTS_KEY(unitId) : (["unit-loadouts"] as const),
    queryFn: () => (unitId !== undefined ? getUnitLoadouts(unitId) : Promise.resolve([])),
    enabled: unitId !== undefined,
  });
}

export function useCreateLoadout() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateLoadoutInput>({
    mutationFn: createLoadout,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: UNIT_LOADOUTS_KEY(vars.unit_id) });
    },
  });
}

export function useDeleteLoadout() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: number; unitId: number }>({
    mutationFn: ({ id }) => deleteLoadout(id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: UNIT_LOADOUTS_KEY(vars.unitId) });
    },
  });
}

export function useActivateLoadout() {
  const qc = useQueryClient();
  return useMutation<void, Error, { loadoutId: number; unitId: number }>({
    mutationFn: ({ loadoutId, unitId }) => activateLoadout(loadoutId, unitId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: UNIT_LOADOUTS_KEY(vars.unitId) });
      // Active loadout name displayed in army list unit rows
      qc.invalidateQueries({ queryKey: ["army-lists"] });
    },
  });
}

export function useAddWargearToLoadout() {
  const qc = useQueryClient();
  return useMutation<number, Error, AddWargearToLoadoutInput & { unitId: number }>({
    mutationFn: ({ unitId: _, ...input }) => addWargearToLoadout(input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: UNIT_LOADOUTS_KEY(vars.unitId) });
    },
  });
}

export function useRemoveWargearFromLoadout() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: number; unitId: number }>({
    mutationFn: ({ id }) => removeWargearFromLoadout(id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: UNIT_LOADOUTS_KEY(vars.unitId) });
    },
  });
}
