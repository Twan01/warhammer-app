import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUnitOverride,
  upsertUnitOverride,
  deleteUnitOverride,
} from "@/db/queries/unitOverrides";
import type { UpsertUnitOverrideInput } from "@/types/unitOverride";

/**
 * UnitOverride query keys (OVRD-01..04).
 *
 * Per-unit factory: each unit's override is its own query subtree.
 * staleTime: Infinity — the override only changes via useUpsertUnitOverride
 * or useDeleteUnitOverride. Local SQLite IPC is sub-5ms; we trade a hard
 * staleness contract for fewer refetches.
 */
export const UNIT_OVERRIDE_KEY = (unitId: number) => ["unit-override", unitId] as const;

/**
 * Loads the override row for a single unit, or null if none exists.
 * Returns immediately (no fetch) when unitId is undefined — supports
 * sheets that mount before a unit is selected.
 */
export function useUnitOverride(unitId: number | undefined) {
  return useQuery({
    queryKey:
      unitId !== undefined ? UNIT_OVERRIDE_KEY(unitId) : (["unit-override", "disabled"] as const),
    queryFn: () =>
      unitId !== undefined ? getUnitOverride(unitId) : Promise.resolve(null),
    enabled: unitId !== undefined,
    staleTime: Infinity,
  });
}

export function useUpsertUnitOverride() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpsertUnitOverrideInput>({
    mutationFn: upsertUnitOverride,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: UNIT_OVERRIDE_KEY(variables.unit_id) });
      // Cache invalidation symmetry: override points feed into army list
      // effective_points — any army list query showing this unit must refetch.
      qc.invalidateQueries({ queryKey: ["army-lists"], exact: false });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"], exact: false });
    },
  });
}

export function useDeleteUnitOverride() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteUnitOverride,
    onSuccess: (_, unitId) => {
      qc.invalidateQueries({ queryKey: UNIT_OVERRIDE_KEY(unitId) });
      qc.invalidateQueries({ queryKey: ["army-lists"], exact: false });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"], exact: false });
    },
  });
}
