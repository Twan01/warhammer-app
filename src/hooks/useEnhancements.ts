/**
 * HON-10 — Named React Query hook for enhancements-by-faction.
 *
 * Wraps getEnhancementsByFaction (BSData read-only table) so consumers
 * call a named hook rather than calling the query function inline.
 * staleTime/gcTime: Infinity — BSData tables are not user-mutable.
 */

import { useQuery } from "@tanstack/react-query";
import { getEnhancementsByFaction } from "@/db/queries/bsdataExtended";

export const ENHANCEMENTS_BY_FACTION_KEY = (factionId: string) =>
  ["enhancements-by-faction", factionId] as const;

export function useEnhancementsByFaction(factionId: string) {
  return useQuery({
    queryKey: ENHANCEMENTS_BY_FACTION_KEY(factionId),
    queryFn: () => getEnhancementsByFaction(factionId),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
