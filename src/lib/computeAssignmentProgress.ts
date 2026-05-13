/**
 * Phase 62 — Assignment progress computation (AR-01).
 *
 * Pure functions for deriving completion percentage and per-section progress
 * from step definitions and progress records. No React or DB imports —
 * consumed by hooks and components via simple function calls.
 */
import type { AssignmentProgress } from "@/types/recipeAssignment";

/**
 * Compute a rounded integer percentage from total and completed counts.
 * Returns 0 when totalSteps is 0 (avoids NaN from 0/0).
 */
export function computeCompletionPercentage(
  totalSteps: number,
  completedSteps: number,
): number {
  if (totalSteps === 0) return 0;
  return Math.round((completedSteps / totalSteps) * 100);
}

/**
 * Compute overall and per-section progress for a recipe assignment.
 *
 * @param steps - Recipe steps with order_index and section_id (from query join)
 * @param progress - Step progress records with order_index and completed flag
 * @returns AssignmentProgress with total, completed, percentage, and bySectionId breakdown
 *
 * Progress records whose order_index doesn't match any step are ignored
 * (stale records from before a step reorder — D-06 accepted edge case).
 */
export function computeAssignmentProgress(
  steps: ReadonlyArray<{ order_index: number; section_id: number | null }>,
  progress: ReadonlyArray<{ order_index: number; completed: number }>,
): AssignmentProgress {
  if (steps.length === 0) {
    return { total: 0, completed: 0, percentage: 0, bySectionId: new Map() };
  }

  // Build lookup: order_index -> completed (0 | 1)
  const progressMap = new Map<number, number>();
  for (const p of progress) {
    progressMap.set(p.order_index, p.completed);
  }

  let total = 0;
  let completed = 0;
  const bySectionId = new Map<number | null, { total: number; completed: number }>();

  for (const step of steps) {
    total += 1;
    const isCompleted = progressMap.get(step.order_index) === 1;
    if (isCompleted) completed += 1;

    // Update per-section bucket
    let bucket = bySectionId.get(step.section_id);
    if (!bucket) {
      bucket = { total: 0, completed: 0 };
      bySectionId.set(step.section_id, bucket);
    }
    bucket.total += 1;
    if (isCompleted) bucket.completed += 1;
  }

  return {
    total,
    completed,
    percentage: computeCompletionPercentage(total, completed),
    bySectionId,
  };
}
