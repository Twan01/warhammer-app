import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Pencil, Trash2, XCircle } from "lucide-react";
import { computeGoalPeriod, deriveGoalStatus } from "@/lib/computeGoalPeriod";
import type { HobbyGoal } from "@/types/goal";

interface GoalCardProps {
  goal: HobbyGoal;
  progressCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function GoalCard({ goal, progressCount, onEdit, onDelete }: GoalCardProps) {
  const goalPeriod = computeGoalPeriod(goal.timeframe, goal.period);
  const status = deriveGoalStatus(progressCount, goal.target_count, goalPeriod.isExpired);
  const safeTarget = Math.max(1, goal.target_count);
  const pct = Math.min(100, Math.round((progressCount / safeTarget) * 100));

  const fillColor =
    status === "completed"
      ? "bg-battle-gold"
      : status === "missed"
      ? "bg-muted-foreground/30"
      : "bg-faction-accent";

  return (
    <Card
      className={[
        "bg-card border border-border/60 shadow-sm",
        status === "missed" ? "opacity-60" : "",
      ]
        .join(" ")
        .trim()}
    >
      <CardContent className="flex flex-col gap-2 p-4">
        {/* Top row: name + actions */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-semibold truncate flex-1">{goal.name}</p>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onEdit}
              aria-label="Edit goal"
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={onDelete}
              aria-label="Delete goal"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {/* Timeframe label */}
        <p className="text-sm text-muted-foreground">{goalPeriod.label}</p>

        {/* Progress text */}
        <p className="text-sm tabular-nums">
          {progressCount} / {goal.target_count} units{" "}
          <span className="text-muted-foreground">({pct}%)</span>
        </p>

        {/* Progress bar (StatCard pattern) */}
        <div className="h-1.5 w-full rounded-full bg-border/40">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${fillColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Status badge */}
        {status === "completed" && (
          <div className="flex items-center gap-1 text-battle-gold text-sm">
            <CheckCircle2 size={14} />
            <span>Completed</span>
          </div>
        )}
        {status === "missed" && (
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <XCircle size={14} />
            <span>Missed</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
