import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUnitPointTiers,
  upsertUnitPointTier,
  deleteUnitPointTier,
} from "@/db/queries/unitPointTiers";
import type { CreateUnitPointTierInput } from "@/types/unitPointTier";

/**
 * Phase 24 — React Query hooks for unit point tiers.
 * Follows useStrategyNote per-unit pattern.
 */

export const UNIT_POINT_TIERS_KEY = (unitId: number) => ["unit-point-tiers", unitId] as const;

export function useUnitPointTiers(unitId: number | undefined) {
  return useQuery({
    queryKey: unitId !== undefined ? UNIT_POINT_TIERS_KEY(unitId) : (["unit-point-tiers", "disabled"] as const),
    queryFn: () => (unitId !== undefined ? getUnitPointTiers(unitId) : Promise.resolve([])),
    enabled: unitId !== undefined,
  });
}

export function useUpsertUnitPointTier() {
  const qc = useQueryClient();
  return useMutation<void, Error, CreateUnitPointTierInput>({
    mutationFn: upsertUnitPointTier,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: UNIT_POINT_TIERS_KEY(vars.unit_id) });
    },
  });
}

export function useDeleteUnitPointTier() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: number; unitId: number }>({
    mutationFn: ({ id }) => deleteUnitPointTier(id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: UNIT_POINT_TIERS_KEY(vars.unitId) });
    },
  });
}
