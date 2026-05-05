import { useState, useMemo } from "react";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoals, useGoalProgress, useDeleteGoal } from "@/hooks/useGoals";
import { computeGoalPeriod, deriveGoalStatus } from "@/features/goals/computeGoalPeriod";
import { GoalCard } from "@/features/goals/GoalCard";
import { GoalSheet } from "@/features/goals/GoalSheet";
import { GoalDeleteDialog } from "@/features/goals/GoalDeleteDialog";
import { GoalEmptyState } from "@/features/goals/GoalEmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import type { HobbyGoal } from "@/types/goal";

type EnrichedGoal = HobbyGoal & { progressCount: number };

/**
 * Goals page root (ANLY-01..03).
 *
 * Owns all portal state (sibling-portal architecture — never nest Sheet/Dialog inside list).
 * Groups goals into Active / Completed / Missed sections via useMemo.
 */
export function GoalsPage() {
  const { data: goals, isLoading, isError } = useGoals();
  const { data: progressMap } = useGoalProgress();
  const deleteGoalMutation = useDeleteGoal();

  // Portal state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<HobbyGoal | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState<HobbyGoal | null>(null);

  // Section grouping
  const { active, completed, missed } = useMemo(() => {
    const active: EnrichedGoal[] = [];
    const completed: EnrichedGoal[] = [];
    const missed: EnrichedGoal[] = [];
    if (!goals) return { active, completed, missed };
    for (const goal of goals) {
      const pc = progressMap?.get(goal.id) ?? 0;
      const { isExpired } = computeGoalPeriod(goal.timeframe, goal.period);
      const status = deriveGoalStatus(pc, goal.target_count, isExpired);
      const enriched: EnrichedGoal = { ...goal, progressCount: pc };
      if (status === "completed") completed.push(enriched);
      else if (status === "missed") missed.push(enriched);
      else active.push(enriched);
    }
    return { active, completed, missed };
  }, [goals, progressMap]);

  function handleCreate() {
    setEditingGoal(null);
    setSheetOpen(true);
  }

  function handleEdit(goal: HobbyGoal) {
    setEditingGoal(goal);
    setSheetOpen(true);
  }

  function handleDeleteRequest(goal: HobbyGoal) {
    setDeletingGoal(goal);
    setDeleteDialogOpen(true);
  }

  function handleDeleteConfirm() {
    if (deletingGoal) {
      deleteGoalMutation.mutate(deletingGoal.id);
      setDeleteDialogOpen(false);
      setDeletingGoal(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Goals"
        subtitle="Track your painting targets"
        actions={
          <Button onClick={handleCreate}>
            <Target className="mr-2 h-4 w-4" />
            New Goal
          </Button>
        }
      />

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">Failed to load goals.</p>
      )}

      {!isLoading && !isError && (goals?.length ?? 0) === 0 && (
        <GoalEmptyState onAdd={handleCreate} />
      )}

      {!isLoading && !isError && (goals?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-0">
          {active.length > 0 && (
            <section>
              <h2 className="text-base font-semibold mb-3">Active Goals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    progressCount={goal.progressCount}
                    onEdit={() => handleEdit(goal)}
                    onDelete={() => handleDeleteRequest(goal)}
                  />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2 className="text-base font-semibold mb-3 mt-6 text-battle-gold">
                Completed
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completed.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    progressCount={goal.progressCount}
                    onEdit={() => handleEdit(goal)}
                    onDelete={() => handleDeleteRequest(goal)}
                  />
                ))}
              </div>
            </section>
          )}

          {missed.length > 0 && (
            <section>
              <h2 className="text-base font-semibold mb-3 mt-6 text-muted-foreground">
                Missed
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {missed.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    progressCount={goal.progressCount}
                    onEdit={() => handleEdit(goal)}
                    onDelete={() => handleDeleteRequest(goal)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Sibling portals at page root — never nested */}
      <GoalSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editingGoal={editingGoal}
      />
      <GoalDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        goal={deletingGoal}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
