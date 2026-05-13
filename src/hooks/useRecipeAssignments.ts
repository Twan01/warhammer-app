import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAssignmentsByUnit,
  getAssignmentsByRecipe,
  createAssignment,
  deleteAssignment,
  getStepProgress,
  upsertStepProgress,
  bulkCreateAssignments,
} from "@/db/queries/recipeAssignments";
import type { CreateRecipeAssignmentInput } from "@/types/recipeAssignment";

// ---------------------------------------------------------------------------
// Cache keys (D-12)
// ---------------------------------------------------------------------------

export const ASSIGNMENTS_KEY = ["recipe-assignments"] as const;

export const UNIT_ASSIGNMENTS_KEY = (unitId: number) =>
  ["recipe-assignments", "by-unit", unitId] as const;

export const RECIPE_ASSIGNMENTS_KEY = (recipeId: number) =>
  ["recipe-assignments", "by-recipe", recipeId] as const;

export const STEP_PROGRESS_KEY = (assignmentId: number) =>
  ["recipe-assignments", "progress", assignmentId] as const;

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

export function useAssignmentsByUnit(unitId: number | undefined) {
  return useQuery({
    queryKey: unitId !== undefined ? UNIT_ASSIGNMENTS_KEY(unitId) : ["recipe-assignments"],
    queryFn: () => (unitId !== undefined ? getAssignmentsByUnit(unitId) : Promise.resolve([])),
    enabled: unitId !== undefined,
  });
}

export function useAssignmentsByRecipe(recipeId: number | undefined) {
  return useQuery({
    queryKey: recipeId !== undefined ? RECIPE_ASSIGNMENTS_KEY(recipeId) : ["recipe-assignments"],
    queryFn: () => (recipeId !== undefined ? getAssignmentsByRecipe(recipeId) : Promise.resolve([])),
    enabled: recipeId !== undefined,
  });
}

export function useStepProgress(assignmentId: number | undefined) {
  return useQuery({
    queryKey: assignmentId !== undefined ? STEP_PROGRESS_KEY(assignmentId) : ["recipe-assignments"],
    queryFn: () => (assignmentId !== undefined ? getStepProgress(assignmentId) : Promise.resolve([])),
    enabled: assignmentId !== undefined,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateRecipeAssignmentInput>({
    mutationFn: createAssignment,
    onSuccess: (_id, input) => {
      /**
       * CASCADE INVALIDATION CONTRACT (D-13 symmetry)
       * useCreateAssignment and useDeleteAssignment MUST invalidate exactly
       * the same cache keys so UI stays consistent regardless of direction.
       */
      qc.invalidateQueries({ queryKey: UNIT_ASSIGNMENTS_KEY(input.unit_id) });
      qc.invalidateQueries({ queryKey: RECIPE_ASSIGNMENTS_KEY(input.recipe_id) });
    },
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: number; unitId: number; recipeId: number }>({
    mutationFn: ({ id }) => deleteAssignment(id),
    onSuccess: (_data, variables) => {
      /**
       * CASCADE INVALIDATION CONTRACT (D-13 symmetry)
       * MUST match useCreateAssignment keys exactly.
       */
      qc.invalidateQueries({ queryKey: UNIT_ASSIGNMENTS_KEY(variables.unitId) });
      qc.invalidateQueries({ queryKey: RECIPE_ASSIGNMENTS_KEY(variables.recipeId) });
    },
  });
}

export function useToggleStepProgress() {
  const qc = useQueryClient();
  return useMutation<void, Error, { assignmentId: number; orderIndex: number; completed: boolean }>({
    mutationFn: ({ assignmentId, orderIndex, completed }) =>
      upsertStepProgress(assignmentId, orderIndex, completed),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: STEP_PROGRESS_KEY(variables.assignmentId) });
    },
  });
}

export function useBulkCreateAssignments() {
  const qc = useQueryClient();
  return useMutation<void, Error, { unitIds: number[]; recipeId: number }>({
    mutationFn: ({ unitIds, recipeId }) => bulkCreateAssignments(unitIds, recipeId),
    onSuccess: (_data, variables) => {
      /**
       * Broad prefix invalidation (Pitfall 5): invalidate ASSIGNMENTS_KEY to
       * cover all per-unit views that may have been affected by the bulk insert.
       */
      qc.invalidateQueries({ queryKey: ASSIGNMENTS_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_ASSIGNMENTS_KEY(variables.recipeId) });
    },
  });
}
