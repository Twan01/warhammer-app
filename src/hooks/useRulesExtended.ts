/**
 * Phase 43 — React Query hooks for extended rules data.
 *
 * Four read paths:
 *   - useStratagemsByFaction(factionId): stratagems for a Wahapedia faction
 *   - useDetachmentsByFaction(factionId): detachments for a Wahapedia faction
 *   - useDetachmentAbilitiesByDetachment(detachmentId): abilities for a detachment
 *   - useSharedAbilitiesByFaction(factionId): shared faction abilities (rw_abilities)
 *
 * staleTime: Infinity matches useDatasheet — rules content is static until
 * explicit re-sync. After sync, useRulesSync invalidates relevant keys.
 */
import { useQuery } from "@tanstack/react-query";
import {
  getStratagemsByFaction,
  getDetachmentsByFaction,
  getDetachmentAbilitiesByDetachment,
  getSharedAbilitiesByFaction,
  getDetachmentById,
  getStratagemsByDetachment,
} from "@/db/queries/rulesExtended";

export const STRATAGEMS_BY_FACTION_KEY = (factionId: string) =>
  ["stratagems-by-faction", factionId] as const;
export const DETACHMENTS_BY_FACTION_KEY = (factionId: string) =>
  ["detachments-by-faction", factionId] as const;
export const DETACHMENT_ABILITIES_KEY = (detachmentId: string) =>
  ["detachment-abilities", detachmentId] as const;
export const SHARED_ABILITIES_BY_FACTION_KEY = (factionId: string) =>
  ["shared-abilities-by-faction", factionId] as const;
export const DETACHMENT_BY_ID_KEY = (detachmentId: string) =>
  ["detachment-by-id", detachmentId] as const;
export const STRATAGEMS_BY_DETACHMENT_KEY = (detachmentId: string) =>
  ["stratagems-by-detachment", detachmentId] as const;

export function useStratagemsByFaction(factionId: string | undefined) {
  return useQuery({
    queryKey: factionId !== undefined
      ? STRATAGEMS_BY_FACTION_KEY(factionId)
      : (["stratagems-by-faction"] as const),
    queryFn: () =>
      factionId !== undefined ? getStratagemsByFaction(factionId) : Promise.resolve([]),
    enabled: factionId !== undefined,
    staleTime: Infinity,
  });
}

export function useDetachmentsByFaction(factionId: string | undefined) {
  return useQuery({
    queryKey: factionId !== undefined
      ? DETACHMENTS_BY_FACTION_KEY(factionId)
      : (["detachments-by-faction"] as const),
    queryFn: () =>
      factionId !== undefined ? getDetachmentsByFaction(factionId) : Promise.resolve([]),
    enabled: factionId !== undefined,
    staleTime: Infinity,
  });
}

export function useDetachmentAbilitiesByDetachment(detachmentId: string | undefined) {
  return useQuery({
    queryKey: detachmentId !== undefined
      ? DETACHMENT_ABILITIES_KEY(detachmentId)
      : (["detachment-abilities"] as const),
    queryFn: () =>
      detachmentId !== undefined
        ? getDetachmentAbilitiesByDetachment(detachmentId)
        : Promise.resolve([]),
    enabled: detachmentId !== undefined,
    staleTime: Infinity,
  });
}

export function useSharedAbilitiesByFaction(factionId: string | undefined) {
  return useQuery({
    queryKey: factionId !== undefined
      ? SHARED_ABILITIES_BY_FACTION_KEY(factionId)
      : (["shared-abilities-by-faction"] as const),
    queryFn: () =>
      factionId !== undefined ? getSharedAbilitiesByFaction(factionId) : Promise.resolve([]),
    enabled: factionId !== undefined,
    staleTime: Infinity,
  });
}

export function useDetachmentById(detachmentId: string | undefined) {
  return useQuery({
    queryKey: detachmentId !== undefined
      ? DETACHMENT_BY_ID_KEY(detachmentId)
      : (["detachment-by-id"] as const),
    queryFn: () =>
      detachmentId !== undefined ? getDetachmentById(detachmentId) : Promise.resolve(null),
    enabled: detachmentId !== undefined,
    staleTime: Infinity,
  });
}

export function useStratagemsByDetachment(detachmentId: string | undefined) {
  return useQuery({
    queryKey: detachmentId !== undefined
      ? STRATAGEMS_BY_DETACHMENT_KEY(detachmentId)
      : (["stratagems-by-detachment"] as const),
    queryFn: () =>
      detachmentId !== undefined ? getStratagemsByDetachment(detachmentId) : Promise.resolve([]),
    enabled: detachmentId !== undefined,
    staleTime: Infinity,
  });
}
