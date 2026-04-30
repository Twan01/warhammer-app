import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPaints,
  getPaintById,
  createPaint,
  updatePaint,
  deletePaint,
} from "@/db/queries/paints";
import type { CreatePaintInput, UpdatePaintInput } from "@/types/paint";

export const PAINTS_KEY = ["paints"] as const;
export const PAINT_KEY = (id: number) => ["paints", id] as const;

export function usePaints() {
  return useQuery({ queryKey: PAINTS_KEY, queryFn: getPaints });
}

export function usePaint(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? PAINT_KEY(id) : PAINTS_KEY,
    queryFn: () => (id !== undefined ? getPaintById(id) : Promise.resolve(null)),
    enabled: id !== undefined,
  });
}

export function useCreatePaint() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreatePaintInput>({
    mutationFn: createPaint,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAINTS_KEY });
    },
  });
}

export function useUpdatePaint() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdatePaintInput>({
    mutationFn: updatePaint,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: PAINTS_KEY });
      qc.invalidateQueries({ queryKey: PAINT_KEY(variables.id) });
    },
  });
}

export function useDeletePaint() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deletePaint,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAINTS_KEY });
    },
    // FK errors (paint referenced in recipe_paints) reject — handled by component try/catch with toast
  });
}
