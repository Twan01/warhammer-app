import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPaints,
  getPaintById,
  getPaintsWithRecipeCount,
  createPaint,
  updatePaint,
  deletePaint,
} from "@/db/queries/paints";
import type { CreatePaintInput, UpdatePaintInput, PaintWithRecipeCount } from "@/types/paint";

export const PAINTS_KEY = ["paints"] as const;
export const PAINT_KEY = (id: number) => ["paints", id] as const;
export const PAINTS_WITH_RECIPES_KEY = ["paints-with-recipes"] as const;

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

/**
 * PINV-05: returns paints with a SQL-computed recipe_count via LEFT JOIN.
 * useCreatePaint/useUpdatePaint/useDeletePaint each invalidate this key in
 * addition to PAINTS_KEY so the Phase 7 Paint Inventory page never shows
 * stale recipe counts after a paint CRUD action.
 */
export function usePaintsWithRecipeCount() {
  return useQuery<PaintWithRecipeCount[]>({
    queryKey: PAINTS_WITH_RECIPES_KEY,
    queryFn: getPaintsWithRecipeCount,
  });
}

export function useCreatePaint() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreatePaintInput>({
    mutationFn: createPaint,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAINTS_KEY });
      qc.invalidateQueries({ queryKey: PAINTS_WITH_RECIPES_KEY });
      // SPEND-03/04 (Pitfall 2): invalidate spending-stats so Spending page stays fresh
      qc.invalidateQueries({ queryKey: ["spending-stats"] });
      qc.invalidateQueries({ queryKey: ["hobby-analytics"] });
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
      qc.invalidateQueries({ queryKey: PAINTS_WITH_RECIPES_KEY });
      // SPEND-03/04 (Pitfall 2): invalidate spending-stats so Spending page stays fresh
      qc.invalidateQueries({ queryKey: ["spending-stats"] });
      qc.invalidateQueries({ queryKey: ["hobby-analytics"] });
    },
  });
}

export function useDeletePaint() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deletePaint,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAINTS_KEY });
      qc.invalidateQueries({ queryKey: PAINTS_WITH_RECIPES_KEY });
      // SPEND-03/04 (Pitfall 2): invalidate spending-stats so Spending page stays fresh
      qc.invalidateQueries({ queryKey: ["spending-stats"] });
      qc.invalidateQueries({ queryKey: ["hobby-analytics"] });
    },
    // FK errors (paint referenced in recipe_paints) reject — handled by component try/catch with toast
  });
}
