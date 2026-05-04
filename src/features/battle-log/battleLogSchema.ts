import { z } from "zod";
import { BATTLE_LOG_RESULTS } from "@/types/battleLog";

/**
 * BATTLE-01..03 — Zod schema for the battle log create/edit Sheet.
 *
 * Required fields per UI-SPEC §Form validation:
 *   battle_date (YYYY-MM-DD), opponent_faction (min 1), mission (min 1),
 *   result (one of "Win" | "Loss" | "Draw").
 *
 * All other fields nullable (optional FKs use ON DELETE SET NULL in DB).
 *
 * NOTE: .default() is deliberately NOT used (zod v4 .default() breaks Resolver
 * type inference with react-hook-form — same issue as armyListSchema). Form
 * defaultValues handle defaults instead.
 *
 * Re-exports BATTLE_LOG_RESULTS so the Sheet only needs one import.
 */
export { BATTLE_LOG_RESULTS };

export const battleLogSchema = z.object({
  battle_date: z
    .string()
    .min(1, "Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  opponent_faction: z
    .string()
    .min(1, "Opponent faction is required")
    .max(120, "Opponent faction must be 120 characters or fewer"),
  mission: z
    .string()
    .min(1, "Mission is required")
    .max(120, "Mission must be 120 characters or fewer"),
  result: z.enum(BATTLE_LOG_RESULTS),
  opponent: z.string().max(120).nullable(),
  points_played: z.number().int().min(0).nullable(),
  my_score: z.number().int().min(0).nullable(),
  opponent_score: z.number().int().min(0).nullable(),
  army_list_id: z.number().int().positive().nullable(),
  mvp_unit_id: z.number().int().positive().nullable(),
  underperforming_unit_id: z.number().int().positive().nullable(),
  lessons_learned: z.string().max(2000).nullable(),
  changes_next_time: z.string().max(2000).nullable(),
  notes: z.string().max(2000).nullable(),
});

export type BattleLogFormValues = z.infer<typeof battleLogSchema>;
