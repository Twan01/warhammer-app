import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getArmyLists,
  getArmyListById,
  getArmyListWithUnits,
  createArmyList,
  updateArmyList,
  deleteArmyList,
  addUnitToList,
  removeUnitFromList,
  updateArmyListUnit,
  getArmyListReadiness,
  clearArmyListDetachment,
  clearArmyListPointsLimit,
  setWarlord,
  clearWarlord,
  addGhostUnitToList,
  setLeaderAttachment,
  clearLeaderAttachment,
  setSelectedModelCount,
  clearSelectedModelCount,
  addEnhancement,
  removeEnhancement,
  getEnhancementsByList,
} from "@/db/queries/armyLists";
import type {
  ArmyListEnhancement,
  AddEnhancementInput,
  CreateArmyListInput,
  UpdateArmyListInput,
  AddUnitToListInput,
  UpdateArmyListUnitInput,
  AddGhostUnitToListInput,
} from "@/types/armyList";

/**
 * Army list query keys (ARMY-01..07).
 *
 * Index key: ['army-lists']
 * Detail key: ['army-lists', id]
 *
 * Mutations also invalidate ['dashboard-stats'] per the DATA-09 forward-compat
 * pattern (decision 02-02 in STATE.md) — even though the v1 dashboard does not
 * yet show army list info, future dashboard work can rely on the cache key
 * already being wired.
 */
export const ARMY_LISTS_KEY = ["army-lists"] as const;
export const ARMY_LIST_KEY = (id: number) => ["army-lists", id] as const;
export const ARMY_LIST_UNITS_KEY = (id: number) => ["army-lists", id, "units"] as const;

/**
 * PLAY-02 — readiness cache key factory.
 *
 * IDs are sorted before spreading into the key so that [1,3,2] and [3,2,1]
 * resolve to the same cache entry (Pitfall 7). Use ARMY_LIST_READINESS_KEY for
 * targeted invalidation; use ["army-list-readiness"] prefix for blanket invalidation.
 */
export const ARMY_LIST_READINESS_KEY = (ids: number[]) =>
  ["army-list-readiness", ...[...ids].sort((a, b) => a - b)] as const;

export function useArmyLists() {
  return useQuery({ queryKey: ARMY_LISTS_KEY, queryFn: getArmyLists });
}

export function useArmyList(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? ARMY_LIST_KEY(id) : ["army-lists", "disabled"],
    queryFn: () => (id !== undefined ? getArmyListById(id) : Promise.resolve(null)),
    enabled: id !== undefined,
  });
}

export function useArmyListWithUnits(listId: number | undefined) {
  return useQuery({
    queryKey: listId !== undefined ? ARMY_LIST_UNITS_KEY(listId) : ["army-lists", "disabled"],
    queryFn: () => (listId !== undefined ? getArmyListWithUnits(listId) : Promise.resolve([])),
    enabled: listId !== undefined,
  });
}

export function useCreateArmyList() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateArmyListInput>({
    mutationFn: createArmyList,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useUpdateArmyList() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateArmyListInput>({
    mutationFn: updateArmyList,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.id) });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useClearArmyListDetachment() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: clearArmyListDetachment,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(id) });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

/**
 * Phase 66 — explicit NULL-clearing for points_limit.
 * Follows useClearArmyListDetachment pattern. Solves the COALESCE-blocks-NULL
 * pitfall for points_limit (Pitfall 1 in RESEARCH).
 */
export function useClearArmyListPointsLimit() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: clearArmyListPointsLimit,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(id) });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useDeleteArmyList() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteArmyList,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(id) });
      qc.invalidateQueries({ queryKey: ["army-list-enhancements", id] });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"], exact: false });
      qc.invalidateQueries({ queryKey: ["army-list-snapshots", id] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useAddUnitToList() {
  const qc = useQueryClient();
  return useMutation<number, Error, AddUnitToListInput>({
    mutationFn: addUnitToList,
    onSuccess: (_insertedId, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
    },
  });
}

/**
 * Removes a single army_list_units row by its own id.
 * The list_id must be passed alongside (as second positional in the mutation
 * variables shape) so onSuccess can invalidate the right list detail.
 */
export interface RemoveUnitFromListInput {
  army_list_unit_id: number;
  list_id: number;
}

export function useRemoveUnitFromList() {
  const qc = useQueryClient();
  return useMutation<void, Error, RemoveUnitFromListInput>({
    mutationFn: ({ army_list_unit_id }) => removeUnitFromList(army_list_unit_id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
    },
  });
}

/**
 * Updates points_override and notes for a single army_list_units row.
 * The list_id is required in the variables so onSuccess can invalidate the
 * right list detail. The underlying query function uses NULL passthrough
 * (NOT COALESCE) so points_override can be cleared back to NULL.
 */
export interface UpdateArmyListUnitVariables extends UpdateArmyListUnitInput {
  list_id: number;
}

export function useUpdateArmyListUnit() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateArmyListUnitVariables>({
    mutationFn: ({ list_id: _list_id, ...rest }) => updateArmyListUnit(rest),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
    },
  });
}

/**
 * PLAY-02 — batch readiness hook.
 *
 * Returns a Map<id, {total, battleReady}> for the given army list IDs.
 * Disabled when ids is empty — avoids SQL IN () error (Pitfall 2).
 * Query key sorts ids for stable caching (Pitfall 7).
 *
 * Invalidated by: useAddUnitToList, useRemoveUnitFromList, useUpdateArmyListUnit,
 * and useUpdateUnit (painting status changes feed into battle-ready points).
 */
export function useArmyListReadiness(ids: number[]) {
  const sortedIds = useMemo(() => [...ids].sort((a, b) => a - b), [ids]);
  return useQuery({
    queryKey: ARMY_LIST_READINESS_KEY(sortedIds),
    queryFn: async () => {
      const rows = await getArmyListReadiness(sortedIds);
      const m = new Map<number, { total: number; battleReady: number }>();
      for (const row of rows) {
        m.set(row.id, { total: row.total_points, battleReady: row.battle_ready_points });
      }
      return m;
    },
    enabled: sortedIds.length > 0,
  });
}

// ─── Phase 89: Army Lists 3.0 mutation hooks ────────────────────────────────

/**
 * Phase 89 — Warlord designation (D-10).
 * Uses CASE WHEN scoped to list_id to atomically deselect-then-select in one UPDATE.
 */
export interface SetWarlordVariables {
  army_list_unit_id: number;
  list_id: number;
}

export function useSetWarlord() {
  const qc = useQueryClient();
  return useMutation<void, Error, SetWarlordVariables>({
    mutationFn: ({ army_list_unit_id, list_id }) => setWarlord(army_list_unit_id, list_id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      // PERF-02: ARMY_LISTS_KEY removed — warlord is a detail-level field not visible in
      // the list index; ARMY_LIST_KEY(id) already covers the specific list detail.
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); // KEEP — DATA-09 forward-compat
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] }); // KEEP — warlord affects readiness display
    },
  });
}

/**
 * Phase 89 — Clear warlord for all units in the list.
 * Variables: list_id (number).
 */
export function useClearWarlord() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: clearWarlord,
    onSuccess: (_, list_id) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(list_id) });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
    },
  });
}

/**
 * Phase 89 — Add a ghost/planned unit to a list (D-04).
 * ghost_unit_name should match BSData canonical name for points resolution.
 */
export function useAddGhostUnitToList() {
  const qc = useQueryClient();
  return useMutation<number, Error, AddGhostUnitToListInput>({
    mutationFn: addGhostUnitToList,
    onSuccess: (_insertedId, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
    },
  });
}

/**
 * Phase 89 — Leader attachment (D-03).
 * Records that army_list_unit_id is attached to target_id.
 */
export interface SetLeaderAttachmentVariables {
  army_list_unit_id: number;
  target_id: number;
  list_id: number;
}

export function useSetLeaderAttachment() {
  const qc = useQueryClient();
  return useMutation<void, Error, SetLeaderAttachmentVariables>({
    mutationFn: ({ army_list_unit_id, target_id }) => setLeaderAttachment(army_list_unit_id, target_id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
    },
  });
}

/**
 * Phase 89 — Clear leader attachment (D-13).
 * Sets leader_attached_to_id = NULL for the given army_list_units row.
 */
export interface ClearLeaderAttachmentVariables {
  army_list_unit_id: number;
  list_id: number;
}

export function useClearLeaderAttachment() {
  const qc = useQueryClient();
  return useMutation<void, Error, ClearLeaderAttachmentVariables>({
    mutationFn: ({ army_list_unit_id }) => clearLeaderAttachment(army_list_unit_id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
    },
  });
}

/**
 * Phase 89 — Set selected model count for tier-based points resolution (D-08).
 * Triggers re-resolution of points via synced_unit_point_tiers JOIN.
 */
export interface SetSelectedModelCountVariables {
  army_list_unit_id: number;
  count: number;
  list_id: number;
}

export function useSetSelectedModelCount() {
  const qc = useQueryClient();
  return useMutation<void, Error, SetSelectedModelCountVariables>({
    mutationFn: ({ army_list_unit_id, count }) => setSelectedModelCount(army_list_unit_id, count),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
    },
  });
}

/**
 * Phase 89 — Clear selected model count back to NULL (D-13).
 * NULL = use default/min tier — points fall through to synced_unit_points.
 */
export interface ClearSelectedModelCountVariables {
  army_list_unit_id: number;
  list_id: number;
}

export function useClearSelectedModelCount() {
  const qc = useQueryClient();
  return useMutation<void, Error, ClearSelectedModelCountVariables>({
    mutationFn: ({ army_list_unit_id }) => clearSelectedModelCount(army_list_unit_id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
    },
  });
}

/**
 * Phase 89 — Add an enhancement to a unit in an army list (D-01, D-02).
 * Enhancement points are tracked separately from the per-unit COALESCE chain.
 */
export function useAddEnhancement() {
  const qc = useQueryClient();
  return useMutation<number, Error, AddEnhancementInput>({
    mutationFn: addEnhancement,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
      qc.invalidateQueries({ queryKey: ["army-list-enhancements", variables.list_id] });
    },
  });
}

/**
 * Phase 89 — Remove an enhancement assignment by its own id.
 */
export interface RemoveEnhancementVariables {
  enhancement_id: number;
  list_id: number;
}

export function useRemoveEnhancement() {
  const qc = useQueryClient();
  return useMutation<void, Error, RemoveEnhancementVariables>({
    mutationFn: ({ enhancement_id }) => removeEnhancement(enhancement_id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["army-list-readiness"] });
      qc.invalidateQueries({ queryKey: ["army-list-enhancements", variables.list_id] });
    },
  });
}

/**
 * Phase 89 — Query hook for all enhancements in an army list.
 * Returns ArmyListEnhancement[] ordered by created_at ASC.
 */
export function useEnhancementsByList(listId: number | undefined) {
  return useQuery<ArmyListEnhancement[]>({
    queryKey: listId !== undefined ? ["army-list-enhancements", listId] : ["army-list-enhancements", "disabled"],
    queryFn: () => getEnhancementsByList(listId!),
    enabled: listId !== undefined,
  });
}
