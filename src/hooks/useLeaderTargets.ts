import { useQuery } from "@tanstack/react-query";
import { getLeaderTargetsByFaction } from "@/db/queries/bsdataExtended";
import type { SyncedLeaderTargetRow } from "@/db/queries/bsdataExtended";

/**
 * Phase 92 — Leader target data hook (LDR-02).
 *
 * Wraps getLeaderTargetsByFaction with React Query caching.
 * faction_id must be passed as a string (TEXT column in rules.db).
 * Callers convert numeric faction IDs via String() before passing.
 */

export const LEADER_TARGETS_KEY = (factionId: string) =>
  ["leader-targets", factionId] as const;

export function useLeaderTargets(factionId: string | null) {
  return useQuery<SyncedLeaderTargetRow[]>({
    queryKey: factionId ? LEADER_TARGETS_KEY(factionId) : ["leader-targets"],
    queryFn: () => getLeaderTargetsByFaction(factionId!),
    enabled: !!factionId,
    staleTime: 5 * 60 * 1000,
  });
}
