import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoalProgress,
} from "@/db/queries/goals";
import type { CreateGoalInput, UpdateGoalInput } from "@/types/goal";

export const GOALS_KEY = ["goals"] as const;
export const GOAL_PROGRESS_KEY = ["goal-progress"] as const;

export function useGoals() {
  return useQuery({ queryKey: GOALS_KEY, queryFn: getGoals });
}

export function useGoalProgress() {
  const { data: goals } = useGoals();
  const goalIds = useMemo(() => (goals ?? []).map((g) => g.id), [goals]);
  return useQuery({
    queryKey: [...GOAL_PROGRESS_KEY, goalIds],
    queryFn: () => getGoalProgress(goals ?? []),
    enabled: goals !== undefined,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateGoalInput>({
    mutationFn: createGoal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GOALS_KEY });
      qc.invalidateQueries({ queryKey: GOAL_PROGRESS_KEY });
    },
    onError: () => {
      toast.error("Failed to create goal — changes were not saved.");
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateGoalInput>({
    mutationFn: updateGoal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GOALS_KEY });
      qc.invalidateQueries({ queryKey: GOAL_PROGRESS_KEY });
    },
    onError: () => {
      toast.error("Failed to update goal — changes were not saved.");
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteGoal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GOALS_KEY });
      qc.invalidateQueries({ queryKey: GOAL_PROGRESS_KEY });
    },
    onError: () => {
      toast.error("Failed to delete goal — changes were not saved.");
    },
  });
}
