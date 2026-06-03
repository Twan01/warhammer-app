import type { UdbUnitSummary } from "@/db/queries/unitDatabase";

export interface UdbFiltersInput {
  subFactionFilter: string | null;
  roleFilter: string | null;
  keywordFilter: string;
  pointMin: number | null;
  pointMax: number | null;
}

/**
 * Pure filter function for unit database browser.
 * AND logic: all active filters must match for a unit to be included.
 *
 * @param units - The list of unit summaries to filter
 * @param filters - Active filter criteria
 * @param keywordsMap - Optional map of unit_id → keywords string for keyword filtering
 */
export function applyUdbFilters(
  units: UdbUnitSummary[],
  filters: UdbFiltersInput,
  keywordsMap?: Map<string, string>,
): UdbUnitSummary[] {
  const keyword = filters.keywordFilter.trim().toLowerCase();

  return units.filter((unit) => {
    // Sub-faction filter (checked first per plan specification)
    // Units pass through if: no sub-faction filter active, OR unit matches the selected sub-faction,
    // OR unit has no sub-faction (generic parent faction unit available to all sub-factions)
    if (
      filters.subFactionFilter !== null &&
      unit.sub_faction !== filters.subFactionFilter &&
      unit.sub_faction !== null
    ) {
      return false;
    }

    // Role filter
    if (filters.roleFilter !== null && unit.role !== filters.roleFilter) {
      return false;
    }

    // Keyword filter (case-insensitive substring match against keywords map)
    if (keyword.length > 0) {
      if (!keywordsMap) return false;
      const unitKeywords = keywordsMap.get(unit.id)?.toLowerCase() ?? "";
      if (!unitKeywords.includes(keyword)) return false;
    }

    // Point min filter — units with null base_points pass through
    if (filters.pointMin !== null) {
      if (unit.base_points === null) return false;
      if (unit.base_points < filters.pointMin) return false;
    }

    // Point max filter — units with null base_points pass through
    if (filters.pointMax !== null) {
      if (unit.base_points === null) return false;
      if (unit.base_points > filters.pointMax) return false;
    }

    return true;
  });
}
