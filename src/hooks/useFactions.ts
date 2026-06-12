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
    queryKey: id !== undefined ? FACTION_KEY(id) : ["factions", "disabled"],
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
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["army-readiness"] });
      qc.invalidateQueries({ queryKey: ["spending-stats"] });
      // Faction delete cascades/sets-null across these entities (FK in schema):
      // painting_recipes.faction_id SET NULL, army_lists.faction_id SET NULL,
      // wishlist.faction_id CASCADE — invalidate so their lists don't show stale rows.
      qc.invalidateQueries({ queryKey: ["recipes"] });
      qc.invalidateQueries({ queryKey: ["army-lists"] });
      qc.invalidateQueries({ queryKey: ["wishlist-items"] });
    },
    // FK errors reject — handled by component try/catch with toast (Pattern 4)
  });
}
