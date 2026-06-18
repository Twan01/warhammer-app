/**
 * HON-10 — Named React Query hooks for BSData per-faction read-only tables.
 *
 * Two hooks wrapping getModelCountsByFaction and getLoadoutOptionsByFaction
 * from bsdataExtended — routes the inline useQuery calls in DatasheetPointsTab.tsx
 * through named hooks with KEY factories.
 *
 * The leader-targets hook was removed in Phase 140:
 * DatasheetPointsTab now uses useLeaderTargetsByFactionCanonical from useLeaderTargets.ts,
 * backed by the canonical udb_leader_targets table (PLAY-02/03).
 *
 * staleTime/gcTime: Infinity — BSData tables are not user-mutable.
 * Both hooks are disabled when factionId is undefined.
 */

import { useQuery } from "@tanstack/react-query";
import {
  getModelCountsByFaction,
  getLoadoutOptionsByFaction,
} from "@/db/queries/bsdataExtended";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const MODEL_COUNTS_KEY = (factionId: string) =>
  ["model-counts-by-faction", factionId] as const;

export const LOADOUT_OPTIONS_KEY = (factionId: string) =>
  ["loadout-options-by-faction", factionId] as const;

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

export function useModelCountsByFaction(factionId: string | undefined) {
  return useQuery({
    queryKey: factionId !== undefined
      ? MODEL_COUNTS_KEY(factionId)
      : ["model-counts-by-faction", "disabled"],
    queryFn: () => getModelCountsByFaction(factionId!),
    enabled: factionId !== undefined,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useLoadoutOptionsByFaction(factionId: string | undefined) {
  return useQuery({
    queryKey: factionId !== undefined
      ? LOADOUT_OPTIONS_KEY(factionId)
      : ["loadout-options-by-faction", "disabled"],
    queryFn: () => getLoadoutOptionsByFaction(factionId!),
    enabled: factionId !== undefined,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
