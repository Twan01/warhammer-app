/**
 * PLAY-05 — GoalProgressCard: compact active-goals widget for the dashboard.
 *
 * Reuses the existing useGoals() + useGoalProgress() hooks (D-09 — no new
 * query or derivation). Adapts the GoalCard progress-bar idiom without
 * importing GoalCard itself (dashboard compact variant: no edit/delete buttons,
 * no status badge).
 *
 * Placement: left column, after "Hobby Health" section (per UI-SPEC Surface 4).
 */
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { useGoals, useGoalProgress } from "@/hooks/useGoals";
import { computeGoalPeriod, deriveGoalStatus } from "@/lib/computeGoalPeriod";

export function GoalProgressCard() {
  const { data: goals = [] } = useGoals();
  const { data: progressMap } = useGoalProgress();

  // Show active and completed goals; hide expired/missed (keeps the card optimistic)
  const visibleGoals = goals.filter((g) => {
    const period = computeGoalPeriod(g.timeframe, g.period);
    const count = progressMap?.get(g.id) ?? 0;
    const status = deriveGoalStatus(count, g.target_count, period.isExpired);
    return status !== "missed";
  });

  if (visibleGoals.length === 0) {
    return (
      <Card className="bg-card border border-border/60 shadow-sm">
        <CardContent className="p-4 flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">No active goals.</p>
          <Link to="/goals" className="text-sm text-faction-accent">
            Set a hobby goal →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {visibleGoals.map((goal) => {
        const count = progressMap?.get(goal.id) ?? 0;
        const period = computeGoalPeriod(goal.timeframe, goal.period);
        const pct = Math.min(
          100,
          Math.round((count / Math.max(1, goal.target_count)) * 100)
        );
        const status = deriveGoalStatus(count, goal.target_count, period.isExpired);
        const fillColor =
          status === "completed" ? "bg-battle-gold" : "bg-faction-accent";

        return (
          <div key={goal.id} className="flex flex-col gap-1">
            {/* Name + count/target on one baseline-aligned row */}
            <div className="flex items-baseline gap-2">
              <p className="text-sm font-medium truncate flex-1">{goal.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums shrink-0">
                {count} / {goal.target_count}
              </p>
            </div>
            {/* Period label */}
            <p className="text-xs text-muted-foreground">{period.label}</p>
            {/* Progress bar (GoalCard idiom) */}
            <div className="h-1.5 w-full rounded-full bg-border/40">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${fillColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
