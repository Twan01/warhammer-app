export const GOAL_TIMEFRAMES = ["month", "quarter"] as const;
export type GoalTimeframe = typeof GOAL_TIMEFRAMES[number];

export interface HobbyGoal {
  id: number;
  name: string;
  target_count: number;
  timeframe: GoalTimeframe;
  period: string;          // "YYYY-MM" or "YYYY-QN"
  created_at: string;
}

export type CreateGoalInput = Omit<HobbyGoal, "id" | "created_at">;
export type UpdateGoalInput = Partial<CreateGoalInput> & { id: number };
