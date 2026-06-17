import { useQuery } from "@tanstack/react-query";
import {
  getLeaderTargetsForList,
  type CanonicalLeaderPairRow,
} from "@/db/queries/leaderTargets";

/**
 * Phase 137 — Leader target data hook rewrite (PLAY-03, D-08).
 *
 * Replaces the Phase-92 faction-keyed hook (getLeaderTargetsByFaction /
 * SyncedLeaderTargetRow) with a list-keyed canonical hook backed by the
 * udb_leader_targets FK join.
 *
 * Key properties:
 * - Keyed by listId (not factionId) — one query per list, not per faction.
 * - staleTime: Infinity — canonical unit-database data never changes between
 *   imports; no need to re-fetch within a session.
 * - Returns CanonicalLeaderPairRow[] (leader_alu_id, target_alu_id) pairs.
 * - enabled: false when listId is null (safe when the sheet/page is closed).
 *
 * D-07 / Pitfall 6: call this hook ONCE at the page or sheet level — never
 * inside a .map() or per-row component. Build the valid-target Set where the
 * prop lands.
 */

export const LEADER_TARGETS_KEY = (listId: number) =>
  ["leader-targets", listId] as const;

export function useLeaderTargets(listId: number | null) {
  return useQuery<CanonicalLeaderPairRow[]>({
    queryKey: listId != null ? LEADER_TARGETS_KEY(listId) : ["leader-targets"],
    queryFn: () => getLeaderTargetsForList(listId!),
    enabled: listId != null,
    staleTime: Infinity, // canonical data — immutable between imports
  });
}
