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
  getUdbUnitsByIds,
  searchUdbUnits,
  getUdbOwnershipByFaction,
  getUdbOwnershipForUnit,
  getUdbKeywordsByFaction,
  getDistinctSubFactions,
  getUdbUnitIdsBySubFaction,
  getUdbPointsTiers,
} from "@/db/queries/unitDatabase";
import type { UdbOwnershipEntry } from "@/db/queries/unitDatabase";
import { useLocale } from "@/stores/localeStore";
import type { Locale } from "@/stores/localeStore";

export const UDB_FACTIONS_KEY = (locale: Locale) =>
  ["udb-factions", locale] as const;
export const UDB_UNITS_KEY = (factionId: string, locale: Locale) =>
  ["udb-units", factionId, locale] as const;
export const UDB_UNIT_DETAIL_KEY = (unitId: string, locale: Locale) =>
  ["udb-unit-detail", unitId, locale] as const;
export const UDB_SEARCH_KEY = (query: string) =>
  ["udb-search", query] as const;

/**
 * Returns all factions in the unit database for the sidebar picker.
 */
export function useUdbFactions() {
  const locale = useLocale();
  return useQuery({
    queryKey: UDB_FACTIONS_KEY(locale),
    queryFn: () => getUdbFactions(locale),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * Returns unit summaries for a faction. Disabled when no faction is selected.
 */
export function useUdbUnits(factionId: string | null) {
  const locale = useLocale();
  return useQuery({
    queryKey:
      factionId !== null
        ? UDB_UNITS_KEY(factionId, locale)
        : (["udb-units", "disabled"] as const),
    queryFn: () =>
      factionId !== null ? getUdbUnitsByFaction(factionId, locale) : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * Returns the full detail for a single unit. Disabled when no unit is selected.
 */
export function useUdbUnitDetail(unitId: string | null) {
  const locale = useLocale();
  return useQuery({
    queryKey:
      unitId !== null
        ? UDB_UNIT_DETAIL_KEY(unitId, locale)
        : (["udb-unit-detail", "disabled"] as const),
    queryFn: () =>
      unitId !== null ? getUdbUnitDetail(unitId, locale) : Promise.resolve(null),
    enabled: !!unitId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * Phase 138-01 PLAY-01 D-02: Batched multi-id hook.
 *
 * Fetches all selected units in a single WHERE id IN (...) query.
 * Key uses a SORTED array so the cache key is stable regardless of insertion order
 * (a Set is not JSON-serializable — RESEARCH Pitfall #2).
 * staleTime: Infinity — canonical unit data, same as useUdbUnitDetail.
 */
export const UDB_UNITS_BY_IDS_KEY = (ids: string[], locale: Locale) =>
  ["udb-units-by-ids", [...ids].sort(), locale] as const;

export function useUdbUnitsByIds(ids: string[]) {
  const locale = useLocale();
  return useQuery({
    queryKey: UDB_UNITS_BY_IDS_KEY(ids, locale),
    queryFn: () => getUdbUnitsByIds(ids, locale),
    enabled: ids.length > 0,
    staleTime: Infinity,
    gcTime: Infinity,
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
    gcTime: Infinity,
  });
}

export const UDB_KEYWORDS_KEY = (factionId: string) =>
  ["udb-keywords", factionId] as const;

export function useUdbKeywords(factionId: string | null) {
  return useQuery({
    queryKey:
      factionId !== null
        ? UDB_KEYWORDS_KEY(factionId)
        : (["udb-keywords", "disabled"] as const),
    queryFn: () =>
      factionId !== null
        ? getUdbKeywordsByFaction(factionId)
        : Promise.resolve(new Map<string, string>()),
    enabled: !!factionId,
    staleTime: Infinity,
    gcTime: Infinity,
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

export function useUdbUnitOwnership(unitId: string | null) {
  return useQuery({
    queryKey: unitId ? ["udb-ownership-unit", unitId] as const : ["udb-ownership-unit", "disabled"] as const,
    queryFn: () => unitId ? getUdbOwnershipForUnit(unitId) : Promise.resolve(null),
    enabled: !!unitId,
    staleTime: 0,
  });
}

// ---------------------------------------------------------------------------
// Phase 109 — Sub-faction hooks
// ---------------------------------------------------------------------------

export const UDB_SUB_FACTIONS_KEY = (factionId: string) =>
  ["udb-sub-factions", factionId] as const;

/**
 * Returns distinct sub-faction names for a faction. Disabled when factionId is null.
 * Returns empty array for factions without sub-factions.
 */
export function useUdbSubFactions(factionId: string | null) {
  return useQuery({
    queryKey:
      factionId !== null
        ? UDB_SUB_FACTIONS_KEY(factionId)
        : (["udb-sub-factions", "disabled"] as const),
    queryFn: () =>
      factionId !== null ? getDistinctSubFactions(factionId) : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export const UDB_SUB_FACTION_UNIT_IDS_KEY = (factionId: string, subFaction: string) =>
  ["udb-sub-faction-unit-ids", factionId, subFaction] as const;

/**
 * Returns UDB unit IDs matching a sub-faction within a faction.
 * Disabled when either param is null. Used for Set-based client-side filtering.
 */
export function useUdbSubFactionUnitIds(factionId: string | null, subFaction: string | null) {
  return useQuery({
    queryKey:
      factionId !== null && subFaction !== null
        ? UDB_SUB_FACTION_UNIT_IDS_KEY(factionId, subFaction)
        : (["udb-sub-faction-unit-ids", "disabled"] as const),
    queryFn: () =>
      factionId !== null && subFaction !== null
        ? getUdbUnitIdsBySubFaction(factionId, subFaction)
        : Promise.resolve([]),
    enabled: !!factionId && !!subFaction,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// UDB Points Tiers — for collection form tier dropdown
// ---------------------------------------------------------------------------

export const UDB_POINTS_TIERS_KEY = (udbUnitId: string) =>
  ["udb-points-tiers", udbUnitId] as const;

export function useUdbPointsTiers(udbUnitId: string | null | undefined) {
  return useQuery({
    queryKey:
      udbUnitId
        ? UDB_POINTS_TIERS_KEY(udbUnitId)
        : (["udb-points-tiers", "disabled"] as const),
    queryFn: () =>
      udbUnitId ? getUdbPointsTiers(udbUnitId) : Promise.resolve([]),
    enabled: !!udbUnitId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
