import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBattleLogs,
  getBattleLogSummary,
  createBattleLog,
  updateBattleLog,
  deleteBattleLog,
} from "@/db/queries/battleLogs";
import { computeBattleLogSummary, type BattleLogSummary }
  from "@/features/battle-log/computeBattleLogSummary";
import type {
  CreateBattleLogInput,
  UpdateBattleLogInput,
} from "@/types/battleLog";

/**
 * Battle log query keys (BATTLE-01..05).
 *
 * Index key: ['battle-logs']
 * Summary key: ['battle-logs', 'summary']
 *
 * Mutations also invalidate ['dashboard-stats'] for forward-compat with future
 * dashboard work that might surface win/loss totals (matches the pattern from
 * useArmyLists, useUnits, useSpendingStats).
 */
export const BATTLE_LOGS_KEY = ["battle-logs"] as const;
export const BATTLE_LOG_SUMMARY_KEY = ["battle-logs", "summary"] as const;

export function useBattleLogs() {
  return useQuery({ queryKey: BATTLE_LOGS_KEY, queryFn: getBattleLogs });
}

export function useBattleLogSummary() {
  return useQuery<BattleLogSummary>({
    queryKey: BATTLE_LOG_SUMMARY_KEY,
    queryFn: async () => {
      const rows = await getBattleLogSummary();
      return computeBattleLogSummary(rows);
    },
  });
}

export function useCreateBattleLog() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateBattleLogInput>({
    mutationFn: createBattleLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BATTLE_LOGS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["recent-activity"] });
    },
  });
}

export function useUpdateBattleLog() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateBattleLogInput>({
    mutationFn: updateBattleLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BATTLE_LOGS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["recent-activity"] });
    },
  });
}

export function useDeleteBattleLog() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteBattleLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BATTLE_LOGS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["recent-activity"] });
    },
  });
}
