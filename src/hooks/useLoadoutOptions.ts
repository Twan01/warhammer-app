import { useQuery } from "@tanstack/react-query";
import { getLoadoutOptionsForUnit } from "@/db/queries/bsdataExtended";
import { getDb } from "@/db/client";

/**
 * Phase 90 — React Query hooks for unit-level loadout data.
 * Phase 106 — Tier hook rewritten to use udb_unit_points via FK (ALI-03).
 *
 * Used by LoadoutBuilderSheet for wargear display (DL-02) and tier selection (DL-01).
 */

export const LOADOUT_OPTIONS_KEY = (unitName: string, factionId: string | null) =>
  ["loadout-options", unitName, factionId] as const;

export const UDB_TIERS_KEY = (udbUnitId: string) =>
  ["udb-tiers", udbUnitId] as const;

export function useLoadoutOptionsForUnit(
  unitName: string | undefined,
  factionId: string | null | undefined,
) {
  return useQuery({
    queryKey: unitName !== undefined
      ? LOADOUT_OPTIONS_KEY(unitName, factionId ?? null)
      : (["loadout-options"] as const),
    queryFn: () =>
      unitName !== undefined
        ? getLoadoutOptionsForUnit(unitName, factionId ?? null)
        : Promise.resolve([]),
    enabled: unitName !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch point tiers for a unit from the canonical unit database (udb_unit_points).
 * Accepts udbUnitId (the FK from units.udb_unit_id) instead of name-based lookup.
 * For ghost units without udb_unit_id, returns empty array (enabled: false).
 */
async function getUdbTiersByUnitId(
  udbUnitId: string,
): Promise<Array<{ model_count: number; points: number }>> {
  const db = await getDb();
  return db.select(
    `SELECT model_count, points
     FROM udb_unit_points
     WHERE unit_id = $1
     ORDER BY model_count ASC`,
    [udbUnitId],
  );
}

export function useTiersByUdbUnitId(
  udbUnitId: string | undefined,
) {
  return useQuery({
    queryKey: udbUnitId !== undefined
      ? UDB_TIERS_KEY(udbUnitId)
      : (["udb-tiers"] as const),
    queryFn: () =>
      udbUnitId !== undefined
        ? getUdbTiersByUnitId(udbUnitId)
        : Promise.resolve([]),
    enabled: udbUnitId !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}
