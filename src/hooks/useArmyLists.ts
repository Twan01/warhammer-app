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
} from "@/db/queries/armyLists";
import type {
  CreateArmyListInput,
  UpdateArmyListInput,
  AddUnitToListInput,
  UpdateArmyListUnitInput,
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

export function useArmyLists() {
  return useQuery({ queryKey: ARMY_LISTS_KEY, queryFn: getArmyLists });
}

export function useArmyList(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? ARMY_LIST_KEY(id) : ARMY_LISTS_KEY,
    queryFn: () => (id !== undefined ? getArmyListById(id) : Promise.resolve(null)),
    enabled: id !== undefined,
  });
}

export function useArmyListWithUnits(listId: number | undefined) {
  return useQuery({
    queryKey: listId !== undefined ? ARMY_LIST_UNITS_KEY(listId) : ARMY_LISTS_KEY,
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

export function useDeleteArmyList() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteArmyList,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useAddUnitToList() {
  const qc = useQueryClient();
  return useMutation<number, Error, AddUnitToListInput>({
    mutationFn: addUnitToList,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ARMY_LIST_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LIST_UNITS_KEY(variables.list_id) });
      qc.invalidateQueries({ queryKey: ARMY_LISTS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
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
    },
  });
}
