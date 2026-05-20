/**
 * DASH-06 — Recent Activity hook for the Dashboard feed.
 *
 * Fetches sessions + battles via getRecentActivity() and merges them with
 * the units array (already in the dashboard-stats cache) using the
 * computeRecentActivity pure function.
 *
 * Query key: ["recent-activity"]. Invalidated by:
 *   - useCreatePaintingSession (qc.invalidateQueries({ queryKey: ["recent-activity"] }))
 *   - useCreateBattleLog, useUpdateBattleLog, useDeleteBattleLog (same)
 *   - Unit mutations already invalidate ["dashboard-stats"] which re-fetches the
 *     units argument passed in by DashboardPage, so unit_added/unit_updated
 *     events refresh automatically without an extra invalidation here.
 */
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getRecentActivity } from "@/db/queries/dashboard";
import {
  computeRecentActivity,
  type ActivityEvent,
} from "@/features/dashboard/computeRecentActivity";
import type { Unit } from "@/types/unit";

export const RECENT_ACTIVITY_KEY = ["recent-activity"] as const;

export function useRecentActivity(units: Unit[] | undefined) {
  const unitIds = useMemo(
    () => (units ?? []).map((u) => u.id).sort((a, b) => a - b),
    [units],
  );
  return useQuery<ActivityEvent[], Error>({
    queryKey: [...RECENT_ACTIVITY_KEY, unitIds],
    queryFn: async () => {
      const { sessions, battles } = await getRecentActivity();
      return computeRecentActivity(units ?? [], sessions, battles);
    },
    enabled: units !== undefined,
  });
}
