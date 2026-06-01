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
} from "@/db/queries/unitDatabase";

// ── Cache keys (backward-compatible exports) ────────────────────────────────

export const DATASHEET_KEY = (unitId: number) => ["datasheet", unitId] as const;
export const DATASHEETS_BY_FACTION_KEY = (factionId: string) =>
  ["datasheets-by-faction", factionId] as const;
export const WAHAPEDIA_FACTIONS_KEY = ["wahapedia-factions"] as const;
export const WAHAPEDIA_FACTION_KEY = (name: string) =>
  ["wahapedia-faction-id", name] as const;

// ── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Returns the UdbUnitDetail linked to a collection unit via units.udb_unit_id.
 * Returns null when the unit has no udb_unit_id link.
 */
export function useDatasheet(unitId: number | undefined) {
  return useQuery({
    queryKey:
      unitId !== undefined
        ? DATASHEET_KEY(unitId)
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
      return getUdbUnitDetail(row.udb_unit_id);
    },
    enabled: unitId !== undefined,
    staleTime: Infinity,
  });
}

/**
 * Returns unit summaries for a faction from the canonical unit database.
 */
export function useDatasheetsByFaction(factionId: string | undefined) {
  return useQuery({
    queryKey:
      factionId !== undefined
        ? DATASHEETS_BY_FACTION_KEY(factionId)
        : (["datasheets-by-faction", "disabled"] as const),
    queryFn: () =>
      factionId !== undefined
        ? getUdbUnitsByFaction(factionId)
        : Promise.resolve([]),
    enabled: factionId !== undefined,
    staleTime: Infinity,
  });
}

/**
 * Returns unit summaries with points for a faction. In the canonical unit
 * database, units already include points -- same query as useDatasheetsByFaction.
 */
export function useDatasheetsByFactionWithPoints(factionId: string | undefined) {
  return useQuery({
    queryKey:
      factionId !== undefined
        ? (["datasheets-with-points", factionId] as const)
        : (["datasheets-with-points", "disabled"] as const),
    queryFn: () =>
      factionId !== undefined
        ? getUdbUnitsByFaction(factionId)
        : Promise.resolve([]),
    enabled: factionId !== undefined,
    staleTime: Infinity,
  });
}

/**
 * Returns all factions from the canonical unit database.
 */
export function useWahapediaFactions() {
  return useQuery({
    queryKey: WAHAPEDIA_FACTIONS_KEY,
    queryFn: getUdbFactions,
    staleTime: Infinity,
  });
}

/**
 * Resolves a HobbyForge faction name to a Wahapedia/udb faction ID.
 * Searches udb_factions by case-insensitive name match.
 */
export function useWahapediaFactionId(localFactionName: string | undefined) {
  return useQuery({
    queryKey:
      localFactionName !== undefined
        ? WAHAPEDIA_FACTION_KEY(localFactionName)
        : (["wahapedia-faction-id", "disabled"] as const),
    queryFn: async () => {
      if (localFactionName === undefined) return null;
      const factions = await getUdbFactions();
      const match = factions.find(
        (f) => f.name.toLowerCase() === localFactionName.toLowerCase(),
      );
      return match?.id ?? null;
    },
    enabled: localFactionName !== undefined,
    staleTime: Infinity,
  });
}
