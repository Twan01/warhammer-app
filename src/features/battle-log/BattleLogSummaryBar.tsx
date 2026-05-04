import type { BattleLogSummary } from "./computeBattleLogSummary";

interface BattleLogSummaryBarProps {
  summary: BattleLogSummary;
}

/**
 * BATTLE-04 — "{N} games · {X}W {Y}L {Z}D · {R}% win rate" strip.
 * Hidden by parent when total === 0 (parent guards rendering).
 */
export function BattleLogSummaryBar({ summary }: BattleLogSummaryBarProps) {
  const { total, wins, losses, draws, winRate } = summary;
  return (
    <div className="flex items-center gap-4 py-3 text-sm text-muted-foreground">
      <span className="font-semibold text-foreground tabular-nums">{total}</span>
      <span>games</span>
      <span className="text-border">·</span>
      <span className="text-green-500 font-semibold tabular-nums">{wins}W</span>
      <span className="text-red-500 font-semibold tabular-nums">{losses}L</span>
      <span className="font-semibold tabular-nums">{draws}D</span>
      <span className="text-border">·</span>
      <span className="tabular-nums">{winRate}% win rate</span>
    </div>
  );
}
