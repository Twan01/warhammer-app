import { useQuery } from "@tanstack/react-query";
import { getTechniqueColourSlots } from "@/db/queries/techniqueColourSlots";

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const TECHNIQUE_COLOUR_SLOTS_KEY = (id: number) =>
  ["technique-colour-slots", id] as const;

// ---------------------------------------------------------------------------
// Read hook — enabled-by-id pattern (safe to call with undefined id)
// ---------------------------------------------------------------------------

/** Returns all colour slots for a technique, ordered by order_index. */
export function useTechniqueColourSlots(id: number | undefined) {
  return useQuery({
    queryKey:
      id !== undefined
        ? TECHNIQUE_COLOUR_SLOTS_KEY(id)
        : ["technique-colour-slots"],
    queryFn: () =>
      id !== undefined ? getTechniqueColourSlots(id) : Promise.resolve([]),
    enabled: id !== undefined,
  });
}
