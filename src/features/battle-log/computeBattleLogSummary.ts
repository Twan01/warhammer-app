/**
 * Pure aggregation function for the Battle Log summary bar (BATTLE-04).
 *
 * Takes the GROUP BY rows returned by getBattleLogSummary() and computes
 * { total, wins, losses, draws, winRate } for the "N games · XW YL ZD · WW%"
 * strip above the chronological list.
 *
 * Mirrors src/features/spending/computeSpendingStats.ts (pure, testable, no I/O).
 */
export interface BattleLogSummary {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // 0-100, integer
}

export function computeBattleLogSummary(
  rows: { result: string; count: number }[]
): BattleLogSummary {
  const get = (r: string) => rows.find((x) => x.result === r)?.count ?? 0;
  const wins = get("Win");
  const losses = get("Loss");
  const draws = get("Draw");
  const total = wins + losses + draws;
  const winRate = total === 0 ? 0 : Math.round((wins / total) * 100);
  return { total, wins, losses, draws, winRate };
}
