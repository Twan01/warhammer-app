import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUnitRulesMapping,
  upsertUnitRulesMapping,
  deleteUnitRulesMapping,
} from "@/db/queries/unitRulesMapping";
import type { UpsertUnitRulesMappingInput } from "@/types/unitRulesMapping";

/**
 * UnitRulesMapping query keys (PV-03..05, D-08).
 *
 * Per-unit factory: each unit's mapping is its own query subtree.
 * staleTime: Infinity — the mapping only changes via upsert/delete mutations.
 */
export const UNIT_RULES_MAPPING_KEY = (unitId: number) =>
  ["unit-rules-mapping", unitId] as const;

/**
 * Loads the mapping row for a single unit, or null if none exists.
 * Returns immediately (no fetch) when unitId is undefined — supports
 * sheets that mount before a unit is selected.
 */
export function useUnitRulesMapping(unitId: number | undefined) {
  return useQuery({
    queryKey:
      unitId !== undefined
        ? UNIT_RULES_MAPPING_KEY(unitId)
        : (["unit-rules-mapping", "disabled"] as const),
    queryFn: () =>
      unitId !== undefined
        ? getUnitRulesMapping(unitId)
        : Promise.resolve(null),
    enabled: unitId !== undefined,
    staleTime: Infinity,
  });
}

export function useUpsertUnitRulesMapping() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpsertUnitRulesMappingInput>({
    mutationFn: upsertUnitRulesMapping,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: UNIT_RULES_MAPPING_KEY(variables.unit_id),
      });
      // Cascade: army list views may show mapping indicators
      qc.invalidateQueries({ queryKey: ["army-lists"], exact: false });
    },
  });
}

export function useDeleteUnitRulesMapping() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteUnitRulesMapping,
    onSuccess: (_, unitId) => {
      qc.invalidateQueries({ queryKey: UNIT_RULES_MAPPING_KEY(unitId) });
      qc.invalidateQueries({ queryKey: ["army-lists"], exact: false });
    },
  });
}
