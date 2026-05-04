/**
 * BATTLE-01 — Win/Loss/Draw badge color mapping.
 *
 * Tailwind class map for the result pill badge. Per UI-SPEC §Color these are
 * semantic colors (NOT faction-accent) and must be applied via Badge className
 * override (do NOT use variant="default" which applies bg-faction-accent).
 */
import type { BattleLogResult } from "@/types/battleLog";

export const RESULT_BADGE_CLASS: Record<BattleLogResult, string> = {
  Win:  "bg-green-500/20 text-green-500 border-0 font-semibold",
  Loss: "bg-red-500/20 text-red-500 border-0 font-semibold",
  Draw: "bg-muted text-muted-foreground border-0 font-semibold",
};

export const RESULT_BADGE_LABEL: Record<BattleLogResult, string> = {
  Win:  "WIN",
  Loss: "LOSS",
  Draw: "DRAW",
};
