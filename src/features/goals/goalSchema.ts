import { z } from "zod";
import { GOAL_TIMEFRAMES } from "@/types/goal";

export { GOAL_TIMEFRAMES };

export const goalSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  target_count: z.number().int().min(1, "Target must be at least 1"),
  timeframe: z.enum(GOAL_TIMEFRAMES),
});

export type GoalFormValues = z.infer<typeof goalSchema>;
