import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from "@/db/queries/recipes";
import type { CreateRecipeInput, UpdateRecipeInput } from "@/types/recipe";

export const RECIPES_KEY = ["recipes"] as const;
export const RECIPE_KEY = (id: number) => ["recipes", id] as const;

export function useRecipes() {
  return useQuery({ queryKey: RECIPES_KEY, queryFn: getRecipes });
}

export function useRecipe(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? RECIPE_KEY(id) : RECIPES_KEY,
    queryFn: () => (id !== undefined ? getRecipeById(id) : Promise.resolve(null)),
    enabled: id !== undefined,
  });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateRecipeInput>({
    mutationFn: createRecipe,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPES_KEY });
      qc.invalidateQueries({ queryKey: ["kanban-enrichment"] });
    },
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateRecipeInput>({
    mutationFn: updateRecipe,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: RECIPES_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_KEY(variables.id) });
      qc.invalidateQueries({ queryKey: ["kanban-enrichment"] });
    },
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteRecipe,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPES_KEY });
    },
  });
}
