/**
 * Phase 120 — Game data React Query hooks.
 *
 * Read hooks for stratagems, enhancements, detachments, and detachment
 * abilities. staleTime: Infinity — all data is static reference content
 * that only changes during a full rules re-import.
 */
import { useQuery } from "@tanstack/react-query";
import {
  getStratagemsByDetachment,
  getStratagemsByFaction,
  getEnhancementsByDetachment,
  getDetachmentsByFaction,
  getDetachmentAbilitiesByFaction,
  getDetachmentAbilitiesByDetachment,
} from "@/db/queries/udbGameData";

// ---------------------------------------------------------------------------
// Query key factories
// ---------------------------------------------------------------------------

export const STRATAGEMS_BY_DETACHMENT_KEY = (detachmentId: string) =>
  ["udb-stratagems-detachment", detachmentId] as const;

export const STRATAGEMS_BY_FACTION_KEY = (factionId: string) =>
  ["udb-stratagems-faction", factionId] as const;

export const ENHANCEMENTS_BY_DETACHMENT_KEY = (detachmentId: string) =>
  ["udb-enhancements-detachment", detachmentId] as const;

export const DETACHMENTS_BY_FACTION_KEY = (factionId: string) =>
  ["udb-detachments-faction", factionId] as const;

export const DETACHMENT_ABILITIES_KEY = (factionId: string) =>
  ["udb-detachment-abilities-faction", factionId] as const;

export const DETACHMENT_ABILITIES_BY_DETACHMENT_KEY = (detachmentId: string) =>
  ["udb-detachment-abilities-detachment", detachmentId] as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Returns stratagems for a detachment (including universal stratagems).
 * Disabled when detachmentId is undefined.
 */
export function useStratagemsByDetachment(detachmentId: string | undefined) {
  return useQuery({
    queryKey: detachmentId
      ? STRATAGEMS_BY_DETACHMENT_KEY(detachmentId)
      : (["udb-stratagems-detachment", "disabled"] as const),
    queryFn: () =>
      detachmentId
        ? getStratagemsByDetachment(detachmentId)
        : Promise.resolve([]),
    enabled: !!detachmentId,
    staleTime: Infinity,
  });
}

/**
 * Returns stratagems for a faction (including universal stratagems).
 * Disabled when factionId is undefined.
 */
export function useStratagemsByFaction(factionId: string | undefined) {
  return useQuery({
    queryKey: factionId
      ? STRATAGEMS_BY_FACTION_KEY(factionId)
      : (["udb-stratagems-faction", "disabled"] as const),
    queryFn: () =>
      factionId ? getStratagemsByFaction(factionId) : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: Infinity,
  });
}

/**
 * Returns enhancements for a detachment.
 * Disabled when detachmentId is undefined.
 */
export function useEnhancementsByDetachment(detachmentId: string | undefined) {
  return useQuery({
    queryKey: detachmentId
      ? ENHANCEMENTS_BY_DETACHMENT_KEY(detachmentId)
      : (["udb-enhancements-detachment", "disabled"] as const),
    queryFn: () =>
      detachmentId
        ? getEnhancementsByDetachment(detachmentId)
        : Promise.resolve([]),
    enabled: !!detachmentId,
    staleTime: Infinity,
  });
}

/**
 * Returns detachments for a faction.
 * Disabled when factionId is undefined.
 */
export function useDetachmentsByFaction(factionId: string | undefined) {
  return useQuery({
    queryKey: factionId
      ? DETACHMENTS_BY_FACTION_KEY(factionId)
      : (["udb-detachments-faction", "disabled"] as const),
    queryFn: () =>
      factionId ? getDetachmentsByFaction(factionId) : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: Infinity,
  });
}

/**
 * Returns all detachment abilities for a faction (with detachment_name).
 * Used by PlaybookTab. Disabled when factionId is null.
 */
export function useDetachmentAbilities(factionId: string | null) {
  return useQuery({
    queryKey: factionId
      ? DETACHMENT_ABILITIES_KEY(factionId)
      : (["udb-detachment-abilities-faction", "disabled"] as const),
    queryFn: () =>
      factionId
        ? getDetachmentAbilitiesByFaction(factionId)
        : Promise.resolve([]),
    enabled: !!factionId,
    staleTime: Infinity,
  });
}

export function useDetachmentAbilitiesByDetachment(detachmentId: string | undefined) {
  return useQuery({
    queryKey: detachmentId
      ? DETACHMENT_ABILITIES_BY_DETACHMENT_KEY(detachmentId)
      : (["udb-detachment-abilities-detachment", "disabled"] as const),
    queryFn: () =>
      detachmentId
        ? getDetachmentAbilitiesByDetachment(detachmentId)
        : Promise.resolve([]),
    enabled: !!detachmentId,
    staleTime: Infinity,
  });
}
