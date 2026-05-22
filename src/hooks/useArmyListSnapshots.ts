/**
 * Phase 95 — React Query hooks for army list snapshots (SNP-01..04).
 *
 * Follows the useArmyLists.ts pattern exactly:
 * - Named query key factories
 * - useQuery with enabled guard
 * - useMutation with targeted cache invalidation
 *
 * useRestoreSnapshot invalidates 6 cache keys because restore replaces
 * all units and enhancements in the list.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSnapshotsByList,
  createSnapshot,
  deleteSnapshot,
  restoreSnapshot,
} from "@/db/queries/armyListSnapshots";
import {
  ARMY_LISTS_KEY,
  ARMY_LIST_KEY,
  ARMY_LIST_UNITS_KEY,
} from "@/hooks/useArmyLists";
import type { CreateSnapshotInput, RestoreSnapshotInput } from "@/types/armyList";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const SNAPSHOTS_KEY = (listId: number) =>
  ["army-list-snapshots", listId] as const;

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all snapshots for a given army list, newest first.
 * Disabled when listId is undefined (no list selected).
 */
export function useSnapshotsByList(listId: number | undefined) {
  return useQuery({
    queryKey: listId !== undefined ? SNAPSHOTS_KEY(listId) : ["army-list-snapshots", "disabled"],
    queryFn: () => getSnapshotsByList(listId!),
    enabled: listId !== undefined,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

export function useCreateSnapshot() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateSnapshotInput>({
    mutationFn: createSnapshot,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: SNAPSHOTS_KEY(variables.list_id) });
    },
  });
}

export function useDeleteSnapshot() {
  const qc = useQueryClient();
  return useMutation<void, Error, { snapshotId: number; list_id: number }>({
    mutationFn: ({ snapshotId }) => deleteSnapshot(snapshotId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: SNAPSHOTS_KEY(variables.list_id) });
    },
  });
}

/**
 * Restore a snapshot. Invalidates all caches affected by the destructive restore:
 * - Snapshot list (new auto-save added)
 * - Army list units (all replaced)
 * - Army list detail (points may change)
 * - Army lists index (points summary)
 * - Readiness (unit composition changed)
 * - Enhancements (all replaced)
 */
export function useRestoreSnapshot() {
  const qc = useQueryClient();
  return useMutation<void, Error, RestoreSnapshotInput>({
    mutationFn: restoreSnapshot,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: SNAPSHOTS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
      qc.invalidateQueries({ queryKey: ["army-list-enhancements", variables.list_id] });
    },
  });
}
