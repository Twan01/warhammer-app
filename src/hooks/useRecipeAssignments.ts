import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAssignmentsByUnit,
  getAssignmentsByRecipe,
  getAssignment,
  createAssignment,
  deleteAssignment,
  getStepProgress,
  upsertStepProgress,
  bulkCreateAssignments,
  completeStepWithSession,
} from "@/db/queries/recipeAssignments";
import type { CreateRecipeAssignmentInput } from "@/types/recipeAssignment";
import type { CreateSessionInput } from "@/types/paintingSession";
import { NEXT_PAINTING_ACTION_KEY } from "@/hooks/useNextPaintingAction";
import { DASHBOARD_STATS_KEY } from "@/hooks/useDashboardStats";

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

export const ASSIGNMENT_KEY = (id: number) =>
  ["recipe-assignments", "by-id", id] as const;

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

export function useRecipeAssignment(id: number | undefined) {
  return useQuery({
    queryKey: id !== undefined ? ASSIGNMENT_KEY(id) : ASSIGNMENTS_KEY,
    queryFn: () => (id !== undefined ? getAssignment(id) : Promise.resolve(null)),
    enabled: id !== undefined,
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
  return useMutation<void, Error, { assignmentId: number; recipeStepId: number; completed: boolean }>({
    mutationFn: ({ assignmentId, recipeStepId, completed }) =>
      upsertStepProgress(assignmentId, recipeStepId, completed),
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

// ---------------------------------------------------------------------------
// Painting-mode: atomic step completion (84-01)
// ---------------------------------------------------------------------------

type CompleteStepVars = {
  assignmentId: number;
  unitId: number;
  recipeStepId: number;
  session: CreateSessionInput;
};

export function useCompleteStep() {
  const qc = useQueryClient();
  return useMutation<void, Error, CompleteStepVars>({
    mutationFn: ({ assignmentId, recipeStepId, session }) =>
      completeStepWithSession(assignmentId, recipeStepId, session),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: STEP_PROGRESS_KEY(variables.assignmentId) });
      // D-06: prefix — we don't know active unit ID sets
      qc.invalidateQueries({ queryKey: ["kanban-enrichment"] });
      qc.invalidateQueries({ queryKey: UNIT_ASSIGNMENTS_KEY(variables.unitId) });
      qc.invalidateQueries({ queryKey: NEXT_PAINTING_ACTION_KEY });
      // D-06: prefix — we don't know active unit ID sets
      qc.invalidateQueries({ queryKey: ["workflow-positions"] });
      qc.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY });
    },
  });
}
