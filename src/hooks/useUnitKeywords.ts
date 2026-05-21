import { useQuery } from "@tanstack/react-query";
import { getUnitKeywords } from "@/db/queries/datasheets";
import type { UnitKeywordStatus } from "@/db/queries/datasheets";

/**
 * Phase 91 — React Query hook for unit keyword status (ENH-02).
 *
 * Wraps getUnitKeywords with staleTime: Infinity because keyword data
 * only changes when rules.db is re-synced (at which point the entire
 * query cache is invalidated by the sync flow).
 *
 * The enabled guard prevents firing when unitName is undefined (e.g.
 * ghost units or before the unit name is known).
 */

export const UNIT_KEYWORDS_KEY = (unitName: string) =>
  ["unit-keywords", unitName] as const;

const SAFE_DEFAULT: UnitKeywordStatus = { isCharacter: false, isEpicHero: false };

export function useUnitKeywords(unitName: string | undefined) {
  return useQuery({
    queryKey: unitName !== undefined
      ? UNIT_KEYWORDS_KEY(unitName)
      : (["unit-keywords"] as const),
    queryFn: () =>
      unitName !== undefined
        ? getUnitKeywords(unitName)
        : Promise.resolve(SAFE_DEFAULT),
    enabled: unitName !== undefined,
    staleTime: Infinity,
  });
}
