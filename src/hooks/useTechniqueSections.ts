import { useQuery } from "@tanstack/react-query";
import {
  getTechniqueSections,
  getTechniqueSteps,
} from "@/db/queries/techniqueSections";

// ---------------------------------------------------------------------------
// Query key factories
// ---------------------------------------------------------------------------

export const TECHNIQUE_SECTIONS_KEY = (id: number) =>
  ["technique-sections", id] as const;

export const TECHNIQUE_STEPS_KEY = (id: number) =>
  ["technique-steps", id] as const;

// ---------------------------------------------------------------------------
// Read hooks — enabled-by-id pattern (safe to call with undefined id)
// ---------------------------------------------------------------------------

/** Returns all sections for a technique, ordered by order_index. */
export function useTechniqueSections(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? TECHNIQUE_SECTIONS_KEY(id) : ["technique-sections"],
    queryFn: () =>
      id !== undefined ? getTechniqueSections(id) : Promise.resolve([]),
    enabled: id !== undefined,
  });
}

/**
 * Returns all steps for a technique, joined through technique_sections.
 * NOTE: technique_steps has no technique_id — steps join via technique_section_id.
 */
export function useTechniqueSteps(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? TECHNIQUE_STEPS_KEY(id) : ["technique-steps"],
    queryFn: () =>
      id !== undefined ? getTechniqueSteps(id) : Promise.resolve([]),
    enabled: id !== undefined,
  });
}
