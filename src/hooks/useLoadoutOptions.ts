import { useQuery } from "@tanstack/react-query";
import { getLoadoutOptionsForUnit } from "@/db/queries/bsdataExtended";
import { getTiersByUnitName } from "@/db/queries/syncedUnitPoints";

/**
 * Phase 90 — React Query hooks for unit-level loadout data.
 * Used by LoadoutBuilderSheet for wargear display (DL-02) and tier selection (DL-01).
 *
 * Both hooks accept string | null for factionId because synced tables store
 * faction_id as TEXT (Pitfall 1 from RESEARCH.md — never pass a number).
 */

export const LOADOUT_OPTIONS_KEY = (unitName: string, factionId: string | null) =>
  ["loadout-options", unitName, factionId] as const;

export const SYNCED_TIERS_BY_NAME_KEY = (unitName: string, factionId: string | null) =>
  ["synced-tiers-by-name", unitName, factionId] as const;

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

export function useTiersByUnitName(
  unitName: string | undefined,
  factionId: string | null | undefined,
) {
  return useQuery({
    queryKey: unitName !== undefined
      ? SYNCED_TIERS_BY_NAME_KEY(unitName, factionId ?? null)
      : (["synced-tiers-by-name"] as const),
    queryFn: () =>
      unitName !== undefined
        ? getTiersByUnitName(unitName, factionId ?? null)
        : Promise.resolve([]),
    enabled: unitName !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}
