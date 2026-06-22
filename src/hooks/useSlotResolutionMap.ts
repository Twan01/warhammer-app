import { useQuery } from "@tanstack/react-query";
import {
  getSlotResolutionMap,
  getSlotMapByInstance,
  getUnfilledSlotCount,
  getStepSlotIdMap,
} from "@/db/queries/recipeTechniqueSlotMaps";

// ---------------------------------------------------------------------------
// Query key factories
// ---------------------------------------------------------------------------

export const SLOT_RESOLUTION_MAP_KEY = (recipeId: number) =>
  ["slot-resolution-map", recipeId] as const;

export const SLOT_MAP_BY_INSTANCE_KEY = (instanceId: number) =>
  ["slot-map-by-instance", instanceId] as const;

export const UNFILLED_SLOT_COUNT_KEY = (recipeId: number) =>
  ["unfilled-slot-count", recipeId] as const;

export const STEP_SLOT_ID_MAP_KEY = (recipeId: number) =>
  ["step-slot-id-map", recipeId] as const;

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

// ---------------------------------------------------------------------------
// useUnfilledSlotCount — count of unfilled colour slots for a recipe
// ---------------------------------------------------------------------------

/**
 * Returns the number of unfilled colour slots for a recipe.
 * Returns 0 when recipeId is undefined (enabled-by-id pattern).
 *
 * Invalidated by useUpdateSlotMap so the readiness banner refreshes after
 * an inline slot reassignment in Painting Mode.
 */
export function useUnfilledSlotCount(recipeId: number | undefined) {
  return useQuery({
    queryKey:
      recipeId !== undefined
        ? UNFILLED_SLOT_COUNT_KEY(recipeId)
        : ["unfilled-slot-count"],
    queryFn: () =>
      recipeId !== undefined
        ? getUnfilledSlotCount(recipeId)
        : Promise.resolve(0),
    enabled: recipeId !== undefined,
  });
}

// ---------------------------------------------------------------------------
// useStepSlotIdMap — Map<recipe_step_id, colour_slot_id|null> for mini-dialog targeting
// ---------------------------------------------------------------------------

/**
 * Returns a map from recipe_step.id to the colour_slot_id for technique steps.
 * Returns an empty Map when recipeId is undefined (enabled-by-id pattern).
 *
 * Used by PaintingModeView to know which slot a tapped technique step maps to,
 * enabling SlotReassignMiniDialog to target the correct slot.
 */
export function useStepSlotIdMap(recipeId: number | undefined) {
  return useQuery({
    queryKey:
      recipeId !== undefined
        ? STEP_SLOT_ID_MAP_KEY(recipeId)
        : ["step-slot-id-map"],
    queryFn: () =>
      recipeId !== undefined
        ? getStepSlotIdMap(recipeId)
        : Promise.resolve(new Map<number, number | null>()),
    enabled: recipeId !== undefined,
  });
}
