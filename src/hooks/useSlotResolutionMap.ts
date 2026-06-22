import { useQuery } from "@tanstack/react-query";
import { getSlotResolutionMap, getSlotMapByInstance } from "@/db/queries/recipeTechniqueSlotMaps";

// ---------------------------------------------------------------------------
// Query key factories
// ---------------------------------------------------------------------------

export const SLOT_RESOLUTION_MAP_KEY = (recipeId: number) =>
  ["slot-resolution-map", recipeId] as const;

export const SLOT_MAP_BY_INSTANCE_KEY = (instanceId: number) =>
  ["slot-map-by-instance", instanceId] as const;

// ---------------------------------------------------------------------------
// useSlotResolutionMap — Map<technique_step_id, paint_id|null> for a recipe
// ---------------------------------------------------------------------------

/**
 * Returns the full slot resolution map for a recipe.
 * Returns an empty Map when recipeId is undefined (enabled-by-id pattern).
 *
 * Consumers pass this map to effectivePaintId() for each step.
 */
export function useSlotResolutionMap(recipeId: number | undefined) {
  return useQuery({
    queryKey:
      recipeId !== undefined
        ? SLOT_RESOLUTION_MAP_KEY(recipeId)
        : ["slot-resolution-map"],
    queryFn: () =>
      recipeId !== undefined
        ? getSlotResolutionMap(recipeId)
        : Promise.resolve(new Map<number, number | null>()),
    enabled: recipeId !== undefined,
  });
}

// ---------------------------------------------------------------------------
// useSlotMapByInstance — Map<slot_id, paint_id|null> for Edit-colours prefill
// ---------------------------------------------------------------------------

/**
 * Returns the slot fills for a specific technique instance.
 * Returns an empty Map when instanceId is undefined (enabled-by-id pattern).
 *
 * Used to pre-populate the Edit-colours form for an existing instance.
 */
export function useSlotMapByInstance(instanceId: number | undefined) {
  return useQuery({
    queryKey:
      instanceId !== undefined
        ? SLOT_MAP_BY_INSTANCE_KEY(instanceId)
        : ["slot-map-by-instance"],
    queryFn: () =>
      instanceId !== undefined
        ? getSlotMapByInstance(instanceId)
        : Promise.resolve(new Map<number, number | null>()),
    enabled: instanceId !== undefined,
  });
}
