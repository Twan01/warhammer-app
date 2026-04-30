import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFactions,
  getFactionById,
  createFaction,
  updateFaction,
  deleteFaction,
} from "@/db/queries/factions";
import type { CreateFactionInput, UpdateFactionInput } from "@/types/faction";

export const FACTIONS_KEY = ["factions"] as const;
export const FACTION_KEY = (id: number) => ["factions", id] as const;

export function useFactions() {
  return useQuery({ queryKey: FACTIONS_KEY, queryFn: getFactions });
}

export function useFaction(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? FACTION_KEY(id) : FACTIONS_KEY,
    queryFn: () => (id !== undefined ? getFactionById(id) : Promise.resolve(null)),
    enabled: id !== undefined,
  });
}

export function useCreateFaction() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateFactionInput>({
    mutationFn: createFaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FACTIONS_KEY });
    },
  });
}

export function useUpdateFaction() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateFactionInput>({
    mutationFn: updateFaction,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: FACTIONS_KEY });
      qc.invalidateQueries({ queryKey: FACTION_KEY(variables.id) });
    },
  });
}

export function useDeleteFaction() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteFaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FACTIONS_KEY });
    },
    // FK errors reject — handled by component try/catch with toast (Pattern 4)
  });
}
