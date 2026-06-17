/**
 * HON-10 — Named React Query hooks for BSData per-faction read-only tables.
 *
 * Three hooks wrapping getModelCountsByFaction, getLoadoutOptionsByFaction,
 * and getLeaderTargetsByFaction from bsdataExtended — routes the three
 * inline useQuery calls in DatasheetPointsTab.tsx through named hooks with
 * KEY factories.
 *
 * staleTime/gcTime: Infinity — BSData tables are not user-mutable.
 * All three hooks are disabled when factionId is undefined.
 */

import { useQuery } from "@tanstack/react-query";
import {
  getModelCountsByFaction,
  getLoadoutOptionsByFaction,
  getLeaderTargetsByFaction,
} from "@/db/queries/bsdataExtended";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const MODEL_COUNTS_KEY = (factionId: string) =>
  ["model-counts-by-faction", factionId] as const;

export const LOADOUT_OPTIONS_KEY = (factionId: string) =>
  ["loadout-options-by-faction", factionId] as const;

export const LEADER_TARGETS_KEY = (factionId: string) =>
  ["leader-targets-by-faction", factionId] as const;

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

export function useLeaderTargetsByFaction(factionId: string | undefined) {
  return useQuery({
    queryKey: factionId !== undefined
      ? LEADER_TARGETS_KEY(factionId)
      : ["leader-targets-by-faction", "disabled"],
    queryFn: () => getLeaderTargetsByFaction(factionId!),
    enabled: factionId !== undefined,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
