/**
 * SPEND-03/04 — Spending stats hook.
 *
 * `["spending-stats"]` is the SAME query key that all 6 mutation hooks invalidate
 * (Plan 14-02 Pitfall 2 contract):
 *   useCreateUnit / useUpdateUnit / useDeleteUnit -> qc.invalidateQueries({ queryKey: ["spending-stats"] })
 *   useCreatePaint / useUpdatePaint / useDeletePaint -> qc.invalidateQueries({ queryKey: ["spending-stats"] })
 *
 * Therefore: any unit or paint mutation anywhere in the app automatically refreshes
 * the Spending page. The cache-key contract test in tests/spending/useSpendingStats.test.ts
 * catches accidental renames before they break this invalidation chain.
 */
import { useQuery } from "@tanstack/react-query";
import { getSpendingStats } from "@/db/queries/spending";
import {
  computeSpendingStats,
  type SpendingStats,
} from "@/features/spending/computeSpendingStats";

export const SPENDING_STATS_KEY = ["spending-stats"] as const;

export function useSpendingStats() {
  return useQuery<SpendingStats, Error>({
    queryKey: SPENDING_STATS_KEY,
    queryFn: async () => {
      const { units, factions, paintsPence } = await getSpendingStats();
      return computeSpendingStats(units, factions, paintsPence);
    },
  });
}
