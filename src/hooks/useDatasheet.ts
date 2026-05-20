/**
 * Phase 15 — Datasheet read hooks (DS-04, DS-06, DS-07).
 *
 * Three read paths:
 *   - useDatasheet(unitId): the linked datasheet for a unit, via
 *     getDatasheetIdForUnit() → getFullDatasheet(). Returns null when no link.
 *   - useDatasheetsByFaction(factionId): the picker's pre-filtered list.
 *   - useRulesSyncMeta(): the rw_sync_meta row, used by PlaybookTab to decide
 *     between empty-banner vs Last-synced label.
 *
 * staleTime: Infinity matches useStrategyNote — datasheet content is static
 * until explicit re-sync. After sync, Plan 15-04's useRulesSync mutation
 * invalidates ["datasheet"] AND ["datasheets-by-faction"] AND RULES_SYNC_META_KEY
 * to force refetch.
 */
import { useQuery } from "@tanstack/react-query";
import {
  getDatasheetIdForUnit,
  getDatasheetsByFaction,
  getDatasheetsByFactionWithPoints,
  getFullDatasheet,
  getRulesSyncMeta,
  getWahapediaFactions,
  resolveWahapediaFactionIdByName,
} from "@/db/queries/datasheets";

export const DATASHEET_KEY = (unitId: number) => ["datasheet", unitId] as const;
export const DATASHEETS_BY_FACTION_KEY = (factionId: string) =>
  ["datasheets-by-faction", factionId] as const;
export const RULES_SYNC_META_KEY = ["rules-sync-meta"] as const;

/**
 * DS-04 + DS-06 + DS-07: returns the FullDatasheet linked to the unit, or null
 * when the unit has no datasheet_id link OR the linked datasheet no longer exists
 * in rules.db.
 */
export function useDatasheet(unitId: number | undefined) {
  return useQuery({
    queryKey: unitId !== undefined ? DATASHEET_KEY(unitId) : (["datasheet"] as const),
    queryFn: async () => {
      if (unitId === undefined) return null;
      const linkedId = await getDatasheetIdForUnit(unitId);
      if (linkedId === null) return null;
      return getFullDatasheet(linkedId);
    },
    enabled: unitId !== undefined,
    staleTime: Infinity,
  });
}

/**
 * DS-04: returns the picker's faction-pre-filtered list (id, name, role projection).
 */
export function useDatasheetsByFaction(factionId: string | undefined) {
  return useQuery({
    queryKey:
      factionId !== undefined
        ? DATASHEETS_BY_FACTION_KEY(factionId)
        : (["datasheets-by-faction"] as const),
    queryFn: () =>
      factionId !== undefined ? getDatasheetsByFaction(factionId) : Promise.resolve([]),
    enabled: factionId !== undefined,
    staleTime: Infinity,
  });
}

/**
 * DS-02 + DS-03: returns the single rw_sync_meta row, or null when rules.db is
 * empty/uninitialized. PlaybookTab uses this to render either the empty-state
 * banner ("Sync datasheets to auto-fill stats") or the Last-synced label.
 */
export function useRulesSyncMeta() {
  return useQuery({
    queryKey: RULES_SYNC_META_KEY,
    queryFn: getRulesSyncMeta,
    staleTime: Infinity,
  });
}

export function useDatasheetsByFactionWithPoints(factionId: string | undefined) {
  return useQuery({
    queryKey:
      factionId !== undefined
        ? (["datasheets-with-points", factionId] as const)
        : (["datasheets-with-points"] as const),
    queryFn: () =>
      factionId !== undefined
        ? getDatasheetsByFactionWithPoints(factionId)
        : Promise.resolve([]),
    enabled: factionId !== undefined,
    staleTime: Infinity,
  });
}

export const WAHAPEDIA_FACTIONS_KEY = ["wahapedia-factions"] as const;

export function useWahapediaFactions() {
  return useQuery({
    queryKey: WAHAPEDIA_FACTIONS_KEY,
    queryFn: getWahapediaFactions,
    staleTime: Infinity,
  });
}

export const WAHAPEDIA_FACTION_KEY = (name: string) =>
  ["wahapedia-faction-id", name] as const;

/**
 * DS-04 cross-DB lookup wrapped as a TanStack Query so the result is cached
 * per HobbyForge faction name. Result lives forever (Wahapedia faction IDs
 * never change without a re-sync, which invalidates RULES_SYNC_META_KEY anyway).
 */
export function useWahapediaFactionId(localFactionName: string | undefined) {
  return useQuery({
    queryKey:
      localFactionName !== undefined
        ? WAHAPEDIA_FACTION_KEY(localFactionName)
        : (["wahapedia-faction-id"] as const),
    queryFn: () =>
      localFactionName !== undefined
        ? resolveWahapediaFactionIdByName(localFactionName)
        : Promise.resolve(null),
    enabled: localFactionName !== undefined,
    staleTime: Infinity,
  });
}
