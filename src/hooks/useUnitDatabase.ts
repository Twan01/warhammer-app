/**
 * Phase 104 — Unit Database read hooks.
 *
 * Four read paths for the canonical unit database browser:
 *   - useUdbFactions(): all factions for the sidebar picker
 *   - useUdbUnits(factionId): units within a selected faction
 *   - useUdbUnitDetail(unitId): full datasheet detail for the sheet view
 *   - useUdbSearch(query): FTS5 full-text search across all units
 *
 * staleTime: Infinity — unit database content is static reference data
 * that only changes when a new unit_database.json is imported.
 */
import { useQuery } from "@tanstack/react-query";
import {
  getUdbFactions,
  getUdbUnitsByFaction,
  getUdbUnitDetail,
  searchUdbUnits,
  getUdbOwnershipByFaction,
} from "@/db/queries/unitDatabase";
import type { UdbOwnershipEntry } from "@/db/queries/unitDatabase";

export const UDB_FACTIONS_KEY = ["udb-factions"] as const;
export const UDB_UNITS_KEY = (factionId: string) =>
  ["udb-units", factionId] as const;
export const UDB_UNIT_DETAIL_KEY = (unitId: string) =>
  ["udb-unit-detail", unitId] as const;
export const UDB_SEARCH_KEY = (query: string) =>
  ["udb-search", query] as const;

/**
 * Returns all factions in the unit database for the sidebar picker.
 */
export function useUdbFactions() {
  return useQuery({
    queryKey: UDB_FACTIONS_KEY,
    queryFn: getUdbFactions,
    staleTime: Infinity,
  });
}

/**
 * Returns unit summaries for a faction. Disabled when no faction is selected.
 */
export function useUdbUnits(factionId: string | null) {
  return useQuery({
    queryKey:
      factionId !== null
        ? UDB_UNITS_KEY(factionId)
        : (["udb-units", "disabled"] as const),
    queryFn: () =>
      factionId !== null ? getUdbUnitsByFaction(factionId) : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: Infinity,
  });
}

/**
 * Returns the full detail for a single unit. Disabled when no unit is selected.
 */
export function useUdbUnitDetail(unitId: string | null) {
  return useQuery({
    queryKey:
      unitId !== null
        ? UDB_UNIT_DETAIL_KEY(unitId)
        : (["udb-unit-detail", "disabled"] as const),
    queryFn: () =>
      unitId !== null ? getUdbUnitDetail(unitId) : Promise.resolve(null),
    enabled: !!unitId,
    staleTime: Infinity,
  });
}

/**
 * Full-text search across all units. Disabled for queries shorter than 2 chars.
 */
export function useUdbSearch(query: string) {
  return useQuery({
    queryKey: UDB_SEARCH_KEY(query),
    queryFn: () => searchUdbUnits(query),
    enabled: query.trim().length >= 2,
    staleTime: Infinity,
  });
}

/**
 * Phase 105 COL-02/COL-04: Ownership key factory for a faction.
 * Uses ["udb-ownership"] prefix so invalidateQueries({ queryKey: ["udb-ownership"] })
 * invalidates ALL faction ownership views at once.
 */
export const UDB_OWNERSHIP_KEY = (factionId: string) =>
  ["udb-ownership", factionId] as const;

/**
 * Phase 105 COL-02/COL-04: Returns aggregated ownership data per udb_unit_id
 * for a faction. staleTime is 0 (NOT Infinity) — ownership is dynamic and
 * changes on unit create/delete. Follows the disabled pattern from useUdbUnits.
 *
 * Per RESEARCH.md Pitfall 3: never use Infinity for ownership data.
 */
export function useUdbOwnership(factionId: string | null): ReturnType<typeof useQuery<UdbOwnershipEntry[]>> {
  return useQuery({
    queryKey:
      factionId !== null
        ? UDB_OWNERSHIP_KEY(factionId)
        : (["udb-ownership", "disabled"] as const),
    queryFn: () =>
      factionId !== null
        ? getUdbOwnershipByFaction(factionId)
        : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: 0,
  });
}
