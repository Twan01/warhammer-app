/**
 * Phase 107 -- Datasheet hooks redirected to udb_* tables.
 *
 * All imports from datasheets.ts (rules.db queries) have been eliminated.
 * Hooks now read from unitDatabase.ts (hobbyforge.db udb_* tables) via getDb().
 *
 * Backward-compatible cache key exports are preserved so existing
 * invalidation calls in consumer components continue to work.
 */
import { useQuery } from "@tanstack/react-query";
import { getDb } from "@/db/client";
import {
  getUdbUnitDetail,
  getUdbUnitsByFaction,
  getUdbFactions,
  getUdbPointsByFaction,
  type UdbPointsByFactionRow,
} from "@/db/queries/unitDatabase";
import { useLocale } from "@/stores/localeStore";

// ── Cache keys (backward-compatible exports) ────────────────────────────────

export const DATASHEET_KEY = (unitId: number) => ["datasheet", unitId] as const;
export const DATASHEETS_BY_FACTION_KEY = (factionId: string) =>
  ["datasheets-by-faction", factionId] as const;
export const WAHAPEDIA_FACTIONS_KEY = ["wahapedia-factions"] as const;
export const POINT_TIERS_KEY = (factionId: string) =>
  ["point-tiers", factionId] as const;

// ── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Returns the UdbUnitDetail linked to a collection unit via units.udb_unit_id.
 * Returns null when the unit has no udb_unit_id link.
 */
export function useDatasheet(unitId: number | undefined) {
  const locale = useLocale();
  return useQuery({
    queryKey:
      unitId !== undefined
        ? [...DATASHEET_KEY(unitId), locale] as const
        : (["datasheet", "disabled"] as const),
    queryFn: async () => {
      if (unitId === undefined) return null;
      const db = await getDb();
      const rows = await db.select<{ udb_unit_id: string | null }[]>(
        "SELECT udb_unit_id FROM units WHERE id = $1",
        [unitId],
      );
      const row = rows[0];
      if (!row || !row.udb_unit_id) return null;
      return getUdbUnitDetail(row.udb_unit_id, locale);
    },
    enabled: unitId !== undefined,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * Returns unit summaries for a faction from the canonical unit database.
 */
export function useDatasheetsByFaction(factionId: string | undefined) {
  const locale = useLocale();
  return useQuery({
    queryKey:
      factionId !== undefined
        ? [...DATASHEETS_BY_FACTION_KEY(factionId), locale] as const
        : (["datasheets-by-faction", "disabled"] as const),
    queryFn: () =>
      factionId !== undefined
        ? getUdbUnitsByFaction(factionId, locale)
        : Promise.resolve([]),
    enabled: factionId !== undefined,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * Returns unit summaries with points for a faction. In the canonical unit
 * database, units already include points -- same query as useDatasheetsByFaction.
 */
export function useDatasheetsByFactionWithPoints(factionId: string | undefined) {
  const locale = useLocale();
  return useQuery({
    queryKey:
      factionId !== undefined
        ? (["datasheets-with-points", factionId, locale] as const)
        : (["datasheets-with-points", "disabled"] as const),
    queryFn: () =>
      factionId !== undefined
        ? getUdbUnitsByFaction(factionId, locale)
        : Promise.resolve([]),
    enabled: factionId !== undefined,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * Phase 140 (WR-03) — Faction-scoped canonical point tiers for the Rules Hub
 * DatasheetPointsTab. Relocated out of the component into the queries/hooks
 * layers to match CLAUDE.md data-access discipline. The queryFn uses the clean
 * `factionId!` form (IN-03) — the query never runs while disabled.
 */
export function usePointTiers(factionId: string | undefined) {
  return useQuery<UdbPointsByFactionRow[]>({
    queryKey:
      factionId !== undefined
        ? POINT_TIERS_KEY(factionId)
        : (["point-tiers", "disabled"] as const),
    queryFn: () => getUdbPointsByFaction(factionId!),
    enabled: factionId !== undefined,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * Returns all factions from the canonical unit database.
 */
export function useWahapediaFactions() {
  const locale = useLocale();
  return useQuery({
    queryKey: [...WAHAPEDIA_FACTIONS_KEY, locale] as const,
    queryFn: () => getUdbFactions(locale),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

