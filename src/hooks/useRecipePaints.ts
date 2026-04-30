import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRecipePaintsByRecipe,
  addRecipePaint,
  removeRecipePaint,
} from "@/db/queries/recipePaints";
import type { CreateRecipePaintInput } from "@/types/recipePaint";

export const RECIPE_PAINTS_KEY = (recipeId: number) => ["recipe-paints", recipeId] as const;

export function useRecipePaints(recipeId: number | undefined) {
  return useQuery({
    queryKey: recipeId !== undefined ? RECIPE_PAINTS_KEY(recipeId) : ["recipe-paints"],
    queryFn: () => (recipeId !== undefined ? getRecipePaintsByRecipe(recipeId) : Promise.resolve([])),
    enabled: recipeId !== undefined,
  });
}

export function useAddRecipePaint() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateRecipePaintInput>({
    mutationFn: addRecipePaint,
    onSuccess: (_, input) => {
      qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(input.recipe_id) });
    },
  });
}

export function useRemoveRecipePaint() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: number; recipeId: number }>({
    mutationFn: ({ id }) => removeRecipePaint(id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(variables.recipeId) });
    },
  });
}
