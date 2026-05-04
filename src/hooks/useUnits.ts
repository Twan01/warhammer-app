import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
} from "@/db/queries/units";
import type { CreateUnitInput, UpdateUnitInput } from "@/types/unit";

export const UNITS_KEY = ["units"] as const;
export const UNIT_KEY = (id: number) => ["units", id] as const;

export function useUnits() {
  return useQuery({ queryKey: UNITS_KEY, queryFn: getUnits });
}

export function useUnit(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? UNIT_KEY(id) : UNITS_KEY,
    queryFn: () => (id !== undefined ? getUnitById(id) : Promise.resolve(null)),
    enabled: id !== undefined,
  });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateUnitInput>({
    mutationFn: createUnit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UNITS_KEY });
      // DATA-09: forward-compatibility — invalidate dashboard-stats when unit data changes
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      // SPEND-03/04 (Pitfall 2): invalidate spending-stats so Spending page stays fresh
      qc.invalidateQueries({ queryKey: ["spending-stats"] });
    },
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateUnitInput>({
    mutationFn: updateUnit,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: UNITS_KEY });
      qc.invalidateQueries({ queryKey: UNIT_KEY(variables.id) });
      // DATA-09: forward-compatibility — invalidate dashboard-stats when unit data changes
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      // SPEND-03/04 (Pitfall 2): invalidate spending-stats so Spending page stays fresh
      qc.invalidateQueries({ queryKey: ["spending-stats"] });
    },
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteUnit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UNITS_KEY });
      // DATA-09: forward-compatibility — invalidate dashboard-stats when unit data changes
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      // SPEND-03/04 (Pitfall 2): invalidate spending-stats so Spending page stays fresh
      qc.invalidateQueries({ queryKey: ["spending-stats"] });
    },
    // FK errors (unit in army_list_units) reject — handled by component try/catch with toast
  });
}
